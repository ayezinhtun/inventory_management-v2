/**
 * Notification Service — thin wrapper around the notifications store and
 * the send-notification Edge Function.
 *
 * Use this service to trigger notifications from business logic (e.g.,
 * low-stock detection, component status changes) without importing the
 * full Zustand store.
 */

import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotifyParams {
  user_id?: string;
  region_id?: string | null;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'alert' | 'success';
  category?: string;
  action_url?: string;
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  to_user_id?: string;
  notification_id?: string;
  region_id?: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Create a single in-app notification for a user.
 * Fire-and-forget — safe to call without await.
 */
export function notifyUser(params: NotifyParams): void {
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sender_id = session?.user?.id ?? null;

      // Determine target user
      let user_id = params.user_id;
      if (!user_id && params.region_id) {
        // Notify the first admin for this region (fallback)
        const { data } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('region_id', params.region_id)
          .eq('role', 'Admin')
          .limit(1)
          .single();
        user_id = data?.user_id;
      }
      if (!user_id) return;

      await supabase.from('notifications').insert({
        user_id,
        title:      params.title,
        message:    params.message,
        type:       params.type     ?? 'info',
        category:   params.category ?? 'system',
        region_id:  params.region_id ?? null,
        action_url: params.action_url ?? null,
        sender_id,
      });
    } catch {
      // Silent — notifications must never break main operations
    }
  })();
}

/**
 * Broadcast a notification to all active users.
 * Fire-and-forget.
 */
export function broadcastNotification(params: Omit<NotifyParams, 'user_id'>): void {
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sender_id = session?.user?.id ?? null;

      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('status', 'active');

      if (!users?.length) return;

      const rows = users.map((u: any) => ({
        user_id:    u.user_id,
        title:      params.title,
        message:    params.message,
        type:       params.type     ?? 'info',
        category:   params.category ?? 'system',
        region_id:  params.region_id ?? null,
        action_url: params.action_url ?? null,
        sender_id,
      }));

      await supabase.from('notifications').insert(rows);
    } catch {
      // Silent
    }
  })();
}

/**
 * Notify all admins about a low-stock component.
 * Fire-and-forget.
 */
export function notifyLowStock(params: {
  item_name: string;
  quantity: number;
  minimum_stock: number;
  region_name: string;
  component_id: string;
}): void {
  (async () => {
    try {
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'Admin')
        .eq('status', 'active');

      if (!admins?.length) return;

      const rows = admins.map((u: any) => ({
        user_id:    u.user_id,
        title:      'Low Stock Alert',
        message:    `${params.item_name} in ${params.region_name} is below minimum (${params.quantity}/${params.minimum_stock}).`,
        type:       'warning',
        category:   'low_stock',
        action_url: 'components',
      }));

      await supabase.from('notifications').insert(rows);
    } catch {
      // Silent
    }
  })();
}

/**
 * Send a real email via the send-notification Edge Function.
 * Returns a promise — handle errors in calling code.
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

/**
 * Build an HTML email from a simple template.
 */
export function buildEmailHtml(params: {
  title: string;
  body: string;
  appName?: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const { title, body, appName = 'IMS', ctaText, ctaUrl } = params;
  const cta = ctaText && ctaUrl
    ? `<div style="margin-top:24px;text-align:center;">
         <a href="${ctaUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${ctaText}</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#6366f1;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${appName}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin-top:0;font-size:18px;color:#111827;">${title}</h2>
      <div style="color:#374151;line-height:1.6;">${body}</div>
      ${cta}
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">This email was sent by ${appName}. Do not reply to this message.</p>
    </div>
  </div>
</body>
</html>`;
}


/**
 * Notify PMs when a new relocation request is created
 */
export function notifyRelocationCreated(params: {
  request_number: string;
  item_name: string;
  destination: string;
  requester_name: string;
}): void {
  (async () => {
    try {
      console.log('[notifyRelocationCreated] Starting notification with params:', params);

      // Get all PMS
      const {data: pms, error: pmError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'PM')
        .eq('status', 'active');

      if (pmError) {
        console.error('[notifyRelocationCreated] Error fetching PMs:', pmError);
        return;
      }

      console.log('[notifyRelocationCreated] Found PMs:', pms?.length);

      if(!pms?.length) {
        console.warn('[notifyRelocationCreated] No active PMs found, skipping notification');
        return;
      }

      const {data: {session}} = await supabase.auth.getSession();
      const sender_id = session?.user?.id ?? null;
      console.log('[notifyRelocationCreated] Sender ID:', sender_id);

      const rows = pms.map((pm: any) => ({
        user_id: pm.user_id,
        title: `New Relocation Request: ${params.request_number}`,
        message: `${params.requester_name} requested to move ${params.item_name} to ${params.destination}`,
        type: 'info' as const,
        category: 'relocation',
        action_url: 'relocation-requests',
        sender_id,
      }));

      console.log('[notifyRelocationCreated] Inserting notifications:', rows);

      const { error: insertError } = await supabase.from('notifications').insert(rows);

      if (insertError) {
        console.error('[notifyRelocationCreated] Error inserting notifications:', insertError);
      } else {
        console.log('[notifyRelocationCreated] Notifications inserted successfully');
      }
    } catch(error: any) {
      console.error('[notifyRelocationCreated] Failed to send relocation created notification:', error);
    }
  })();
}


/**
 * Notify Engineer and Admin when PM approves relocation
 */
export function notifyRelocationApprovedByPM(params: {
  requester_id: string;
  request_number: string;
  approved_by_name: string;
}): void {
  (async () => {
    try {
      console.log('[notifyRelocationApprovedByPM] Starting notification with params:', params);

      const {data: {session}} = await supabase.auth.getSession();
      const sender_id = session?.user?.id ?? null;
      console.log('[notifyRelocationApprovedByPM] Sender ID:', sender_id);

      // Get the requester's actual user_id from user_profiles
      const {data: requesterProfile, error: requesterError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('id', params.requester_id)
        .single();

      if (requesterError || !requesterProfile) {
        console.error('[notifyRelocationApprovedByPM] Error fetching requester profile:', requesterError);
        return;
      }

      const requesterUserId = requesterProfile.user_id;
      console.log('[notifyRelocationApprovedByPM] Requester user_id:', requesterUserId);

      // Get all Admins
      const {data: admins, error: adminError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'Admin')
        .eq('status', 'active');

      if (adminError) {
        console.error('[notifyRelocationApprovedByPM] Error fetching admins:', adminError);
        return;
      }

      console.log('[notifyRelocationApprovedByPM] Found admins:', admins?.length);

      // Target users: Engineer (requester) + all admins
      const targetUserIds = [requesterUserId, ...(admins?.map((a: any) => a.user_id) || [])];
      console.log('[notifyRelocationApprovedByPM] Target user IDs:', targetUserIds);

      const rows = targetUserIds.map((user_id) => ({
        user_id,
        title: `Relocation Request ${params.request_number} Approved by PM`,
        message: `Approved by PM: ${params.approved_by_name}, Pending Admin approval`,
        type: 'success' as const,
        category: 'relocation',
        action_url: 'relocation-requests',
        sender_id,
      }));

      console.log('[notifyRelocationApprovedByPM] Inserting notifications:', rows);

      const { error: insertError } = await supabase.from('notifications').insert(rows);

      if (insertError) {
        console.error('[notifyRelocationApprovedByPM] Error inserting notifications:', insertError);
      } else {
        console.log('[notifyRelocationApprovedByPM] Notifications inserted successfully');
      }
    } catch(error: any) {
      console.error('[notifyRelocationApprovedByPM] Failed to send relocation approved notification:', error);
    }
  })();
}


/**
 * Notify Engineer when PM rejects relocation
 */

export function notifyRelocationRejectedByPM(params: {
  requester_id: string;
  request_number: string;
  rejected_by_name: string;
  comments: string;
}): void {
  (async () => {
    try {
      console.log('[notifyRelocationRejectedByPM] Starting notification with params:', params);

      // Get the requester's actual user_id from user_profiles
      const {data: requesterProfile, error: requesterError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('id', params.requester_id)
        .single();

      if (requesterError || !requesterProfile) {
        console.error('[notifyRelocationRejectedByPM] Error fetching requester profile:', requesterError);
        return;
      }

      const requesterUserId = requesterProfile.user_id;
      console.log('[notifyRelocationRejectedByPM] Requester user_id:', requesterUserId);

      notifyUser({
        user_id: requesterUserId,
        title: `Relocation Request ${params.request_number} Rejected by PM`,
        message: `Rejected by PM: ${params.rejected_by_name}. Reason: ${params.comments}`,
        type: 'alert',
        category: 'relocation',
        action_url: 'relocation-requests',
      });
      console.log('[notifyRelocationRejectedByPM] Notification sent');
    } catch (error) {
      console.error('[notifyRelocationRejectedByPM] Error:', error);
    }
  })();
}

/**
 * Notify Engineer and PM when Admin approves relocation
 */

export function notifyRelocationApprovedByAdmin(params: {
  requester_id: string;
  request_number: string;
  approved_by_name: string;
}): void {
  (async () => {
    try {
      console.log('[notifyRelocationApprovedByAdmin] Starting notification with params:', params);

      const {data: {session}} = await supabase.auth.getSession();
      const sender_id = session?.user?.id ?? null;
      console.log('[notifyRelocationApprovedByAdmin] Sender ID:', sender_id);

      // Get the requester's actual user_id from user_profiles
      const {data: requesterProfile, error: requesterError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('id', params.requester_id)
        .single();

      if (requesterError || !requesterProfile) {
        console.error('[notifyRelocationApprovedByAdmin] Error fetching requester profile:', requesterError);
        return;
      }

      const requesterUserId = requesterProfile.user_id;
      console.log('[notifyRelocationApprovedByAdmin] Requester user_id:', requesterUserId);

      // Get all PMS
      const {data: pms, error: pmError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'PM')
        .eq('status', 'active');

      if (pmError) {
        console.error('[notifyRelocationApprovedByAdmin] Error fetching PMs:', pmError);
        return;
      }

      console.log('[notifyRelocationApprovedByAdmin] Found PMs:', pms?.length);

       // Target users: Engineer (requester) + all PMs
       const targetUserIds = [requesterUserId, ...(pms?.map((p: any) => p.user_id) || [])];
       console.log('[notifyRelocationApprovedByAdmin] Target user IDs:', targetUserIds);

       const rows = targetUserIds.map((user_id) => ({
        user_id,
        title: `Relocation Request ${params.request_number} Approved by Admin`,
        message: `Approved by Admin: ${params.approved_by_name}`,
        type: 'success' as const,
        category: 'relocation',
        action_url: 'relocation-requests',
        sender_id,
       }));

       console.log('[notifyRelocationApprovedByAdmin] Inserting notifications:', rows);

       const { error: insertError } = await supabase.from('notifications').insert(rows);

       if (insertError) {
         console.error('[notifyRelocationApprovedByAdmin] Error inserting notifications:', insertError);
       } else {
         console.log('[notifyRelocationApprovedByAdmin] Notifications inserted successfully');
       }
    } catch(error: any) {
      console.error('[notifyRelocationApprovedByAdmin] Failed to send relocation approved notification:', error);
    }
  })();
}


/**
 * Notify Engineer and PM when Admin rejects relocation
 */

export function notifyRelocationRejectedByAdmin(params: {
  requester_id: string;
  request_number: string;
  rejected_by_name: string;
  comments: string;
}): void {
  (async () => {
    try {
      console.log('[notifyRelocationRejectedByAdmin] Starting notification with params:', params);

      const {data: {session}} = await supabase.auth.getSession();
      const sender_id = session?.user?.id ?? null;
      console.log('[notifyRelocationRejectedByAdmin] Sender ID:', sender_id);

      // Get the requester's actual user_id from user_profiles
      const {data: requesterProfile, error: requesterError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('id', params.requester_id)
        .single();

      if (requesterError || !requesterProfile) {
        console.error('[notifyRelocationRejectedByAdmin] Error fetching requester profile:', requesterError);
        return;
      }

      const requesterUserId = requesterProfile.user_id;
      console.log('[notifyRelocationRejectedByAdmin] Requester user_id:', requesterUserId);

      // Get all PMs
      const {data: pms, error: pmError} = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'PM')
        .eq('status', 'active');

      if (pmError) {
        console.error('[notifyRelocationRejectedByAdmin] Error fetching PMs:', pmError);
        return;
      }

      console.log('[notifyRelocationRejectedByAdmin] Found PMs:', pms?.length);

      // Target users: Engineer (requester) + all PMs
      const targetUserIds = [requesterUserId, ...(pms?.map((p: any) => p.user_id) || [])];
      console.log('[notifyRelocationRejectedByAdmin] Target user IDs:', targetUserIds);

      const rows = targetUserIds.map((user_id) => ({
        user_id,
        title: `Relocation Request ${params.request_number} Rejected by Admin`,
        message: `Rejected by Admin: ${params.rejected_by_name}. Reason: ${params.comments}`,
        type: 'alert' as const,
        category: 'relocation',
        action_url: 'relocation-requests',
        sender_id,
      }));

      console.log('[notifyRelocationRejectedByAdmin] Inserting notifications:', rows);

      const { error: insertError } = await supabase.from('notifications').insert(rows);

      if (insertError) {
        console.error('[notifyRelocationRejectedByAdmin] Error inserting notifications:', insertError);
      } else {
        console.log('[notifyRelocationRejectedByAdmin] Notifications inserted successfully');
      }

    } catch(error: any) {
      console.error('[notifyRelocationRejectedByAdmin] Failed to send relocation rejected notification:', error);
    }
  })();
}
