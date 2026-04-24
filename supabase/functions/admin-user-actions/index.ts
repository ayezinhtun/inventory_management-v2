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
    Deno.env.get('VITE_SUPABASE_URL')!,
    Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Parse body early — needed to detect 'forgot_password' before auth check
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  // Intentionally UNAUTHENTICATED — called from the login page.
  // Invalidates the current password so the old one can't be used after reset.
  if (body.action === 'forgot_password') {
    const { email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const targetUser = users.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (targetUser) {
        // Set a random temp password — old password immediately stops working
        const tempPwd = generatePassword();
        await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password: tempPwd });
      }
      // Always return success (don't reveal whether email exists)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      // Still return success to avoid email enumeration
      console.error('[forgot_password]', err.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── All other actions require Admin auth ───────────────────────────────────
  // Get token from body instead of Authorization header
  const { _token, ...restBody } = body;
  body = restBody; // Remove _token from body for rest of processing

  if (!_token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Decode JWT manually (just get user ID from payload)
  let userId: string;
  try {
    const parts = _token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    userId = payload.sub;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user is admin
  const { data: callerProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, email')
    .eq('user_id', userId)
    .single();

  if (callerProfile?.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const user = { id: userId, email: callerProfile?.email || '' };

  try {
    const { action } = body;

    // ── CREATE USER ──────────────────────────────────────────────────────────
    if (action === 'create') {
      const { email, name, role, region_ids, warehouse_ids } = body;
      if (!email || !name || !role) throw new Error('email, name, and role are required');

      const password = generatePassword();

      const { data: authUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr) throw createErr;

      await supabaseAdmin.from('user_profiles').upsert({
        user_id: authUser.user.id,
        name,
        email,
        role,
        force_password_change: true,
        status: 'active',
      }, { onConflict: 'user_id' });

      if (region_ids && Array.isArray(region_ids) && region_ids.length > 0) {
        const rows = region_ids.map(rid => ({ user_id: authUser.user.id, region_id: rid }));
        await supabaseAdmin.from('user_regions').insert(rows);
      }

      if (warehouse_ids && Array.isArray(warehouse_ids) && warehouse_ids.length > 0) {
        const rows = warehouse_ids.map(wid => ({ user_id: authUser.user.id, warehouse_id: wid }));
        await supabaseAdmin.from('user_warehouses').insert(rows);
      }

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

    // ── DELETE USER ──────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { target_user_id } = body;
      if (!target_user_id) throw new Error('target_user_id is required');
      if (target_user_id === user.id) throw new Error('Cannot delete your own account');

      // Log before deleting (cascade may remove profile row)
      await supabaseAdmin.from('user_activity_logs').insert({
        user_id: target_user_id,
        actor_id: user.id,
        action: 'ACCOUNT_DELETED',
        details: { deleted_by: user.email },
      });

      await supabaseAdmin.from('user_profiles').delete().eq('user_id', target_user_id);
      await supabaseAdmin.from('user_regions').delete().eq('user_id', target_user_id);
      await supabaseAdmin.from('user_warehouses').delete().eq('user_id', target_user_id);

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── RESET PASSWORD ───────────────────────────────────────────────────────
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
