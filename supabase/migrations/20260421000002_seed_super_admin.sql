-- =============================================================
-- Seed Super Admin account
-- Safe to re-run (idempotent).
-- Credentials: admin@1cng.com / Admin@1CNG2027!
-- =============================================================

`         
-- Ensure pgcrypto is available. On Supabase cloud it lives in the
-- "extensions" schema — add that schema to the search_path so that
-- crypt() / gen_salt() resolve without a fully-qualified prefix.
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
SET search_path TO public, extensions;

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@1cng.com') THEN

    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin@1cng.com',
      extensions.crypt('Admin@1CNG2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Super Admin"}'::jsonb,
      false, now(), now(), '', '', '', ''
    );

    -- Trigger handle_new_user creates the profile row; promote it to Admin.
    UPDATE public.user_profiles
    SET name = 'Super Admin', role = 'Admin', status = 'active'
    WHERE user_id = v_admin_id;

    RAISE NOTICE 'Super Admin created → admin@1cng.com';
  ELSE
    -- Already exists — just make sure role is correct.
    UPDATE public.user_profiles
    SET role = 'Admin', name = 'Super Admin'
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@1cng.com')
      AND role <> 'Admin';

    RAISE NOTICE 'Super Admin already exists — role confirmed.';
  END IF;
END $$;
