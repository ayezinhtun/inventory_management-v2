/**
 * Mail store — drives the Administration → Mail feature.
 * Uses email_messages + email_recipients + mail_logs tables.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MailStatus = 'draft' | 'pending' | 'sending' | 'sent' | 'failed' | 'scheduled';

export interface MailRecipient {
  user_id?: string | null;
  email:    string;
  name:     string;
  type:     'to' | 'cc' | 'bcc';
}

export interface EmailMessage {
  id:            string;
  thread_id:     string | null;
  sender_id:     string | null;
  sender_email:  string;
  sender_name:   string;
  subject:       string;
  body_html:     string;
  body_text:     string;
  status:        MailStatus;
  scheduled_at:  string | null;
  sent_at:       string | null;
  error_message: string | null;
  provider_id:   string | null;
  is_system:     boolean;
  created_at:    string;
  updated_at:    string;
  // joined
  recipients?:   MailRecipient[];
  // for inbox — the recipient row for current user
  is_read?:      boolean;
  recipient_id?: string;
}

export interface MailLog {
  id:         string;
  message_id: string | null;
  user_id:    string | null;
  user_name?: string;
  action:     string;
  details:    Record<string, any> | null;
  created_at: string;
  // joined
  message?:   { subject: string; sender_name: string; sender_email: string } | null;
}

export interface ComposeParams {
  to:          MailRecipient[];
  cc?:         MailRecipient[];
  bcc?:        MailRecipient[];
  subject:     string;
  body_html:   string;
  body_text:   string;
  scheduled_at?: string | null;
}

interface MailState {
  inbox:    EmailMessage[];
  sent:     EmailMessage[];
  drafts:   EmailMessage[];
  pending:  EmailMessage[];
  failed:   EmailMessage[];
  mailLogs: MailLog[];

  isLoading:    boolean;
  isLogLoading: boolean;
  isSending:    boolean;

  fetchInbox:    () => Promise<void>;
  fetchSent:     () => Promise<void>;
  fetchPending:  () => Promise<void>;
  fetchFailed:   () => Promise<void>;
  fetchMailLogs: () => Promise<void>;     // admin: all users
  fetchAll:      () => Promise<void>;

  saveDraft:    (params: ComposeParams) => Promise<string>;   // returns message id
  sendMail:     (params: ComposeParams) => Promise<void>;
  retrySend:    (messageId: string) => Promise<void>;
  markRead:     (recipientId: string) => Promise<void>;
  deleteMail:   (messageId: string, kind: 'sent' | 'inbox') => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveUserNames(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, name')
    .in('user_id', userIds);
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => { map[p.user_id] = p.name; });
  return map;
}

async function insertMailLog(message_id: string | null, action: string, details?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  await supabase.from('mail_logs').insert({
    message_id, user_id: session.user.id, action, details: details ?? null,
  }).throwOnError();
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMailStore = create<MailState>((set, get) => ({
  inbox:    [],
  sent:     [],
  drafts:   [],
  pending:  [],
  failed:   [],
  mailLogs: [],
  isLoading: false,
  isLogLoading: false,
  isSending: false,

  // ── fetchInbox ─────────────────────────────────────────────────────────────
  fetchInbox: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get recipient rows for this user
      const { data: recRows, error } = await supabase
        .from('email_recipients')
        .select('id, message_id, is_read, type')
        .eq('user_id', session.user.id)
        .eq('is_deleted', false)
        .eq('type', 'to')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const messageIds = (recRows ?? []).map((r: any) => r.message_id);
      if (!messageIds.length) { set({ inbox: [], isLoading: false }); return; }

      const { data: messages } = await supabase
        .from('email_messages')
        .select('*')
        .in('id', messageIds)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      // Merge is_read from recipient row
      const recMap: Record<string, { is_read: boolean; id: string }> = {};
      (recRows ?? []).forEach((r: any) => { recMap[r.message_id] = { is_read: r.is_read, id: r.id }; });

      set({
        inbox: (messages ?? []).map((m: any) => ({
          ...m,
          is_read:      recMap[m.id]?.is_read  ?? true,
          recipient_id: recMap[m.id]?.id        ?? null,
        })),
        isLoading: false,
      });
    } catch (err) {
      console.error('[Mail] fetchInbox:', err);
      set({ isLoading: false });
    }
  },

  // ── fetchSent ──────────────────────────────────────────────────────────────
  fetchSent: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: messages, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('sender_id', session.user.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Attach recipients for display
      const ids = (messages ?? []).map((m: any) => m.id);
      let recMap: Record<string, MailRecipient[]> = {};
      if (ids.length) {
        const { data: recs } = await supabase
          .from('email_recipients')
          .select('message_id, email, name, type')
          .in('message_id', ids)
          .eq('type', 'to');
        (recs ?? []).forEach((r: any) => {
          if (!recMap[r.message_id]) recMap[r.message_id] = [];
          recMap[r.message_id].push({ email: r.email, name: r.name, type: r.type });
        });
      }

      set({
        sent: (messages ?? []).map((m: any) => ({ ...m, recipients: recMap[m.id] ?? [] })),
        isLoading: false,
      });
    } catch (err) {
      console.error('[Mail] fetchSent:', err);
      set({ isLoading: false });
    }
  },

  // ── fetchPending ───────────────────────────────────────────────────────────
  fetchPending: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('sender_id', session.user.id)
        .in('status', ['pending', 'scheduled', 'sending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ pending: (data ?? []) as EmailMessage[], isLoading: false });
    } catch (err) {
      console.error('[Mail] fetchPending:', err);
      set({ isLoading: false });
    }
  },

  // ── fetchFailed ────────────────────────────────────────────────────────────
  fetchFailed: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('sender_id', session.user.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ failed: (data ?? []) as EmailMessage[], isLoading: false });
    } catch (err) {
      console.error('[Mail] fetchFailed:', err);
      set({ isLoading: false });
    }
  },

  // ── fetchMailLogs (admin) ──────────────────────────────────────────────────
  fetchMailLogs: async () => {
    set({ isLogLoading: true });
    try {
      const { data: logs, error } = await supabase
        .from('mail_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const userIds = [...new Set((logs ?? []).map((l: any) => l.user_id).filter(Boolean))];
      const nameMap = await resolveUserNames(userIds as string[]);

      // Attach message subjects
      const msgIds = [...new Set((logs ?? []).map((l: any) => l.message_id).filter(Boolean))];
      let msgMap: Record<string, any> = {};
      if (msgIds.length) {
        const { data: msgs } = await supabase
          .from('email_messages')
          .select('id, subject, sender_name, sender_email')
          .in('id', msgIds);
        (msgs ?? []).forEach((m: any) => { msgMap[m.id] = m; });
      }

      set({
        mailLogs: (logs ?? []).map((l: any) => ({
          ...l,
          user_name: l.user_id ? (nameMap[l.user_id] ?? 'Unknown') : 'System',
          message:   l.message_id ? msgMap[l.message_id] ?? null : null,
        })) as MailLog[],
        isLogLoading: false,
      });
    } catch (err) {
      console.error('[Mail] fetchMailLogs:', err);
      set({ isLogLoading: false });
    }
  },

  // ── fetchAll ───────────────────────────────────────────────────────────────
  fetchAll: async () => {
    await Promise.all([
      get().fetchInbox(),
      get().fetchSent(),
      get().fetchPending(),
      get().fetchFailed(),
    ]);
  },

  // ── saveDraft ──────────────────────────────────────────────────────────────
  saveDraft: async (params) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles').select('name, email').eq('user_id', session.user.id).single();

    const { data: msg, error } = await supabase
      .from('email_messages')
      .insert({
        sender_id:    session.user.id,
        sender_email: profile?.email   ?? session.user.email ?? '',
        sender_name:  profile?.name    ?? 'Unknown',
        subject:      params.subject,
        body_html:    params.body_html,
        body_text:    params.body_text,
        status:       'draft',
      })
      .select('id')
      .single();

    if (error) throw error;

    // Insert recipients
    const allRecs = [
      ...(params.to  ?? []).map((r) => ({ ...r, type: 'to'  })),
      ...(params.cc  ?? []).map((r) => ({ ...r, type: 'cc'  })),
      ...(params.bcc ?? []).map((r) => ({ ...r, type: 'bcc' })),
    ];
    if (allRecs.length) {
      await supabase.from('email_recipients').insert(
        allRecs.map((r) => ({
          message_id: msg!.id,
          user_id:    r.user_id   ?? null,
          email:      r.email,
          name:       r.name,
          type:       r.type,
        }))
      );
    }

    insertMailLog(msg!.id, 'draft_saved', { subject: params.subject }).catch(() => {});
    return msg!.id;
  },

  // ── sendMail ───────────────────────────────────────────────────────────────
  sendMail: async (params) => {
    set({ isSending: true });
    try {
      // 1. Save as pending
      const messageId = await get().saveDraft(params);

      // 2. Update status to pending
      await supabase.from('email_messages')
        .update({
          status:       params.scheduled_at ? 'scheduled' : 'pending',
          scheduled_at: params.scheduled_at ?? null,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', messageId);

      if (!params.scheduled_at) {
        // 3. Trigger edge function
        const { error } = await supabase.functions.invoke('send-mail', {
          body: { message_id: messageId },
        });
        if (error) throw new Error(error.message);
      }

      // Refresh sent/pending
      await get().fetchSent();
      await get().fetchPending();
    } finally {
      set({ isSending: false });
    }
  },

  // ── retrySend ──────────────────────────────────────────────────────────────
  retrySend: async (messageId) => {
    await supabase.from('email_messages')
      .update({ status: 'pending', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    const { error } = await supabase.functions.invoke('send-mail', {
      body: { message_id: messageId },
    });
    if (error) throw new Error(error.message);

    insertMailLog(messageId, 'retried').catch(() => {});
    await get().fetchFailed();
    await get().fetchSent();
  },

  // ── markRead ───────────────────────────────────────────────────────────────
  markRead: async (recipientId) => {
    await supabase.from('email_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', recipientId);
    set((s) => ({
      inbox: s.inbox.map((m) =>
        m.recipient_id === recipientId ? { ...m, is_read: true } : m
      ),
    }));
  },

  // ── deleteMail ─────────────────────────────────────────────────────────────
  deleteMail: async (messageId, kind) => {
    if (kind === 'inbox') {
      // Soft-delete recipient row
      const msg = get().inbox.find((m) => m.id === messageId);
      if (msg?.recipient_id) {
        await supabase.from('email_recipients')
          .update({ is_deleted: true })
          .eq('id', msg.recipient_id);
      }
      set((s) => ({ inbox: s.inbox.filter((m) => m.id !== messageId) }));
    } else {
      // Soft-delete from sent perspective (mark deleted for sender)
      await supabase.from('email_messages')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', messageId);
      set((s) => ({ sent: s.sent.filter((m) => m.id !== messageId) }));
    }
    insertMailLog(messageId, 'deleted').catch(() => {});
  },
}));
