/**
 * Notifications store — real Supabase-backed notifications.
 * Handles in-app notifications + email log management.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'warning' | 'alert' | 'success';
export type NotificationCategory = 'system' | 'inventory' | 'component' | 'user' | 'email' | 'low_stock';
export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  region_id: string | null;
  warehouse_id: string | null;
  is_read: boolean;
  action_url: string | null;
  sender_id: string | null;
  sender_name?: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  sender_id: string | null;
  to_email: string;
  to_user_id: string | null;
  subject: string;
  html_body: string | null;
  status: EmailStatus;
  provider: string;
  provider_id: string | null;
  error_message: string | null;
  notification_id: string | null;
  region_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendNotificationParams {
  // Who receives it
  user_ids?: string[];              // specific users
  region_id?: string | null;        // all users in a region
  role?: string | null;             // all users with a role
  broadcast?: boolean;              // all active users

  // Content
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;

  // Email
  send_email?: boolean;
  email_subject?: string;
  email_html?: string;
}

interface NotificationsState {
  notifications:   AppNotification[];
  emailLogs:       EmailLog[];
  templates:       NotificationTemplate[];
  unreadCount:     number;
  isLoading:       boolean;
  isEmailLoading:  boolean;
  lastUpdated:     Date | null;

  // User actions
  fetchNotifications:     () => Promise<void>;
  markRead:               (id: string) => Promise<void>;
  markAllRead:            () => Promise<void>;
  subscribeToRealtime:    () => () => void;

  // Admin actions
  fetchAllNotifications:  () => Promise<void>;
  fetchEmailLogs:         () => Promise<void>;
  fetchTemplates:         () => Promise<void>;
  sendNotification:       (params: SendNotificationParams) => Promise<void>;
  updateTemplate:         (id: string, updates: Partial<NotificationTemplate>) => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications:  [],
  emailLogs:      [],
  templates:      [],
  unreadCount:    0,
  isLoading:      false,
  isEmailLoading: false,
  lastUpdated:    null,

  // ── fetchNotifications ─────────────────────────────────────────────────────
  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs = (data ?? []) as AppNotification[];

      // Resolve sender names
      const senderIds = [...new Set(notifs.map((n) => n.sender_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, name')
          .in('user_id', senderIds);
        (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.name; });
      }

      const withNames = notifs.map((n) => ({
        ...n,
        sender_name: n.sender_id ? (nameMap[n.sender_id] ?? 'System') : 'System',
      }));

      set({
        notifications: withNames,
        unreadCount: withNames.filter((n) => !n.is_read).length,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('[Notifications] fetchNotifications error:', err);
      set({ isLoading: false });
    }
  },

  // ── markRead ───────────────────────────────────────────────────────────────
  markRead: async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    set((s) => {
      const updated = s.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n);
      return { notifications: updated, unreadCount: updated.filter((n) => !n.is_read).length };
    });
  },

  // ── markAllRead ────────────────────────────────────────────────────────────
  markAllRead: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  // ── subscribeToRealtime ────────────────────────────────────────────────────
  subscribeToRealtime: () => {
    const setupAsync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return () => {};

      const channel = supabase
        .channel(`notifications-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const n = payload.new as AppNotification;
            set((s) => ({
              notifications: [n, ...s.notifications],
              unreadCount: s.unreadCount + 1,
            }));
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    let unsub: (() => void) | undefined;
    setupAsync().then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  },

  // ── fetchAllNotifications (admin) ──────────────────────────────────────────
  fetchAllNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const notifs = (data ?? []) as AppNotification[];

      // Resolve sender names
      const senderIds = [...new Set(notifs.map((n) => n.sender_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, name')
          .in('user_id', senderIds);
        (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.name; });
      }

      set({
        notifications: notifs.map((n) => ({
          ...n,
          sender_name: n.sender_id ? (nameMap[n.sender_id] ?? 'System') : 'System',
        })),
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('[Notifications] fetchAllNotifications error:', err);
      set({ isLoading: false });
    }
  },

  // ── fetchEmailLogs (admin) ─────────────────────────────────────────────────
  fetchEmailLogs: async () => {
    set({ isEmailLoading: true });
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      set({ emailLogs: (data ?? []) as EmailLog[], isEmailLoading: false });
    } catch (err) {
      console.error('[Notifications] fetchEmailLogs error:', err);
      set({ isEmailLoading: false });
    }
  },

  // ── fetchTemplates ─────────────────────────────────────────────────────────
  fetchTemplates: async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      set({ templates: (data ?? []) as NotificationTemplate[] });
    } catch (err) {
      console.error('[Notifications] fetchTemplates error:', err);
    }
  },

  // ── sendNotification (admin) ───────────────────────────────────────────────
  sendNotification: async (params) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    // Resolve target user IDs
    let targetUserIds: string[] = params.user_ids ?? [];

    if (params.broadcast) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('status', 'active');
      targetUserIds = (users ?? []).map((u: any) => u.user_id);
    } else if (params.region_id && targetUserIds.length === 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('region_id', params.region_id)
        .eq('status', 'active');
      targetUserIds = (users ?? []).map((u: any) => u.user_id);
    } else if (params.role && targetUserIds.length === 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', params.role)
        .eq('status', 'active');
      targetUserIds = (users ?? []).map((u: any) => u.user_id);
    }

    if (targetUserIds.length === 0) {
      throw new Error('No target users found');
    }

    // Insert notification rows
    const rows = targetUserIds.map((uid) => ({
      user_id:      uid,
      title:        params.title,
      message:      params.message,
      type:         params.type     ?? 'info',
      category:     params.category ?? 'system',
      region_id:    params.region_id ?? null,
      sender_id:    session.user.id,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('notifications')
      .insert(rows)
      .select('id');
    if (insertErr) throw insertErr;

    // Optionally send emails
    if (params.send_email && params.email_subject && params.email_html) {
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .in('user_id', targetUserIds);

      const emailPromises = (userProfiles ?? []).map(async (u: any, idx: number) => {
        const notifId = inserted?.[idx]?.id ?? null;
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              to:              u.email,
              subject:         params.email_subject,
              html:            params.email_html,
              to_user_id:      u.user_id,
              notification_id: notifId,
              region_id:       params.region_id ?? null,
            },
          });
        } catch {
          // Email failure is non-blocking
        }
      });

      await Promise.allSettled(emailPromises);
    }

    // Refresh local state
    await get().fetchAllNotifications();
  },

  // ── updateTemplate ─────────────────────────────────────────────────────────
  updateTemplate: async (id, updates) => {
    const { error } = await supabase
      .from('notification_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    set((s) => ({
      templates: s.templates.map((t) => t.id === id ? { ...t, ...updates } : t),
    }));
  },
}));
