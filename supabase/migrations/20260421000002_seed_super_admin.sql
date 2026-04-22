-- =============================================================
-- Seed Super Admin account
-- This runs as a migration so it is applied to both local and
-- cloud via `supabase db push`.  Safe to re-run (idempotent).
-- Credentials: admin@1cng.com / Admin@1CNG2026!
-- =============================================================

-- pgcrypto is required for crypt() and gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@1cng.com') THEN

    -- Insert the auth user with email pre-confirmed so they can sign in immediately
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@1cng.com',
      crypt('Admin@1CNG2026!', gen_salt('bf')),
      now(),                                             -- pre-confirmed
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Super Admin"}'::jsonb,
      false,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- The handle_new_user trigger fires automatically and inserts a
    -- user_profiles row (role = 'user').  Promote it to Admin.
    UPDATE public.user_profiles
    SET
      name   = 'Super Admin',
      role   = 'Admin',
      status = 'active'
    WHERE user_id = v_admin_id;

    RAISE NOTICE 'Super Admin created → admin@1cng.com / Admin@1CNG2026!';
  ELSE
    -- Ensure existing admin always has the correct role in case it was
    -- accidentally downgraded.
    UPDATE public.user_profiles
    SET role = 'Admin', name = 'Super Admin'
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@1cng.com')
      AND role <> 'Admin';

    RAISE NOTICE 'Super Admin already exists — role confirmed.';
  END IF;
END $$;
