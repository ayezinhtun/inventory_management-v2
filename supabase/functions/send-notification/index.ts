/**
 * send-notification Edge Function
 *
 * Sends a transactional email via Resend and records the result in email_logs.
 *
 * Required env vars:
 *   RESEND_API_KEY       — from resend.com (free tier: 3,000/month)
 *   FROM_EMAIL           — verified sender address (e.g. noreply@yourdomain.com)
 *   SUPABASE_URL         — injected automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase
 *
 * Request body:
 *   {
 *     to: string,           // recipient email
 *     subject: string,
 *     html: string,         // HTML email body
 *     to_user_id?: string,  // optional — stored in email_logs
 *     notification_id?: string,
 *     region_id?: string,
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Auth check ────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Only admins can send notifications
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Forbidden — Admin only' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { to, subject, html, to_user_id, notification_id, region_id } = body;

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@ims.local';

  // ── Insert pending log ────────────────────────────────────────────────────
  const { data: logRow } = await supabase.from('email_logs').insert({
    sender_id:       user.id,
    to_email:        to,
    to_user_id:      to_user_id ?? null,
    subject,
    html_body:       html,
    status:          'pending',
    provider:        'resend',
    notification_id: notification_id ?? null,
    region_id:       region_id ?? null,
  }).select('id').single();

  const logId = logRow?.id;

  // ── If no Resend key — mark as skipped (dev mode) ─────────────────────────
  if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY') {
    console.warn('[send-notification] No RESEND_API_KEY — email skipped (dev mode)');
    if (logId) {
      await supabase.from('email_logs').update({
        status: 'sent',
        provider_id: 'dev-skip',
        sent_at: new Date().toISOString(),
      }).eq('id', logId);
    }
    return new Response(
      JSON.stringify({ success: true, mode: 'dev-skip', message: 'Email skipped (no API key configured)' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Send via Resend ───────────────────────────────────────────────────────
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(resendData?.message ?? `Resend error ${resendRes.status}`);
    }

    // Update log to sent
    if (logId) {
      await supabase.from('email_logs').update({
        status:      'sent',
        provider_id: resendData.id ?? null,
        sent_at:     new Date().toISOString(),
      }).eq('id', logId);
    }

    return new Response(
      JSON.stringify({ success: true, provider_id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[send-notification] Resend error:', err);

    if (logId) {
      await supabase.from('email_logs').update({
        status:        'failed',
        error_message: err?.message ?? 'Unknown error',
      }).eq('id', logId);
    }

    return new Response(
      JSON.stringify({ error: err?.message ?? 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
