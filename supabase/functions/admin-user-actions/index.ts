import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  const all = upper + lower + digits + special;
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (callerProfile?.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse body early so we can handle unauthenticated actions
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── FORGOT PASSWORD (unauthenticated) ──────────────────────────────────
  // Invalidates the user's current password by setting a random temp one,
  // so the old password no longer works. The client then sends a reset email.
  if (body.action === 'forgot_password') {
    const { email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      // Find user by email
      const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const targetUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!targetUser) {
        // Return success even when not found (security: don't reveal if email exists)
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Set a random temporary password — old password is immediately invalid
      const tempPwd = generatePassword();
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id, { password: tempPwd }
      );
      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const { action } = body;

    // ── CREATE USER ────────────────────────────────────────────────────────
    if (action === 'create') {
      const { email, name, role, region_id, warehouse_id } = body;
      if (!email || !name || !role) throw new Error('email, name, and role are required');

      const password = generatePassword();

      const { data: authUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr) throw createErr;

      await supabaseAdmin.from('user_profiles').update({
        name,
        role,
        region_id: region_id || null,
        warehouse_id: warehouse_id || null,
        force_password_change: true,
        status: 'active',
      }).eq('user_id', authUser.user.id);

      await supabaseAdmin.from('user_activity_logs').insert({
        user_id: authUser.user.id,
        actor_id: user.id,
        action: 'ACCOUNT_CREATED',
        details: { created_by: user.email, role, email },
      });

      return new Response(JSON.stringify({ password, user_id: authUser.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE USER ────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { target_user_id } = body;
      if (!target_user_id) throw new Error('target_user_id is required');
      if (target_user_id === user.id) throw new Error('Cannot delete your own account');

      await supabaseAdmin.from('user_activity_logs').insert({
        user_id: target_user_id,
        actor_id: user.id,
        action: 'ACCOUNT_DELETED',
        details: { deleted_by: user.email },
      }).catch(() => {});

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── RESET PASSWORD ─────────────────────────────────────────────────────
    if (action === 'reset_password') {
      const { target_user_id } = body;
      if (!target_user_id) throw new Error('target_user_id is required');

      const password = generatePassword();

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(
        target_user_id, { password }
      );
      if (resetErr) throw resetErr;

      await supabaseAdmin.from('user_profiles').update({
        force_password_change: true,
        updated_at: new Date().toISOString(),
      }).eq('user_id', target_user_id);

      await supabaseAdmin.from('user_activity_logs').insert({
        user_id: target_user_id,
        actor_id: user.id,
        action: 'PASSWORD_RESET',
        details: { reset_by: user.email },
      });

      return new Response(JSON.stringify({ password }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
