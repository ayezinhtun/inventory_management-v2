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
