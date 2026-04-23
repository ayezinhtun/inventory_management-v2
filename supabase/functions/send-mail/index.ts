/**
 * send-mail Edge Function
 * Sends an email_messages record via Resend, updates status, logs to mail_logs.
 *
 * Required env:
 *   RESEND_API_KEY  — resend.com free API key
 *   FROM_EMAIL      — verified sender address
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — auto-injected
 *
 * Body: { message_id: string }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders }   from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Auth
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

  const { message_id } = await req.json();
  if (!message_id) {
    return new Response(JSON.stringify({ error: 'message_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch message
  const { data: msg, error: msgErr } = await supabase
    .from('email_messages')
    .select('*')
    .eq('id', message_id)
    .single();

  if (msgErr || !msg) {
    return new Response(JSON.stringify({ error: 'Message not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify the caller owns the message (or is admin)
  const { data: callerProfile } = await supabase
    .from('user_profiles').select('role').eq('user_id', user.id).single();
  const isAdmin = callerProfile?.role === 'Admin';
  if (msg.sender_id !== user.id && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch "to" recipients
  const { data: recipients } = await supabase
    .from('email_recipients')
    .select('email, name, type')
    .eq('message_id', message_id)
    .in('type', ['to', 'cc', 'bcc']);

  const toList  = (recipients ?? []).filter((r: any) => r.type === 'to').map((r: any) => r.email);
  const ccList  = (recipients ?? []).filter((r: any) => r.type === 'cc').map((r: any) => r.email);
  const bccList = (recipients ?? []).filter((r: any) => r.type === 'bcc').map((r: any) => r.email);

  if (toList.length === 0) {
    return new Response(JSON.stringify({ error: 'No recipients found' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Mark as sending
  await supabase.from('email_messages').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', message_id);

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'noreply@ims.local';

  // Dev mode — no API key
  if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY') {
    await supabase.from('email_messages').update({
      status: 'sent', sent_at: new Date().toISOString(), provider_id: 'dev-skip',
      updated_at: new Date().toISOString(),
    }).eq('id', message_id);
    await supabase.from('mail_logs').insert({
      message_id, user_id: user.id, action: 'sent',
      details: { mode: 'dev-skip', to: toList },
    });
    return new Response(JSON.stringify({ success: true, mode: 'dev-skip' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Send via Resend
  try {
    const payload: any = {
      from:    `${msg.sender_name || 'IMS'} <${FROM_EMAIL}>`,
      to:      toList,
      subject: msg.subject,
      html:    msg.body_html || `<p>${msg.body_text}</p>`,
    };
    if (ccList.length)  payload.cc  = ccList;
    if (bccList.length) payload.bcc = bccList;

    const res  = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? `Resend ${res.status}`);

    await supabase.from('email_messages').update({
      status: 'sent', sent_at: new Date().toISOString(),
      provider_id: data.id ?? null, updated_at: new Date().toISOString(),
    }).eq('id', message_id);

    await supabase.from('mail_logs').insert({
      message_id, user_id: user.id, action: 'sent',
      details: { provider_id: data.id, to: toList },
    });

    return new Response(JSON.stringify({ success: true, provider_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const errMsg = err?.message ?? 'Unknown error';
    await supabase.from('email_messages').update({
      status: 'failed', error_message: errMsg, updated_at: new Date().toISOString(),
    }).eq('id', message_id);
    await supabase.from('mail_logs').insert({
      message_id, user_id: user.id, action: 'failed',
      details: { error: errMsg },
    });
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
