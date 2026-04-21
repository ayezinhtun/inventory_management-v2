-- =============================================================
-- IMS v2 — Seed Data
-- Seeds the Super Admin account for system management.
-- Safe to run multiple times (idempotent via IF NOT EXISTS guard).
-- =============================================================

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
BEGIN
  -- Only create if the admin account doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@1cng.com') THEN

    -- 1. Insert into auth.users (Supabase Auth internal table)
    --    email_confirmed_at = now() so the account is immediately usable
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
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Super Admin"}'::jsonb,
      false,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 2. The handle_new_user trigger fires automatically and creates a
    --    user_profiles row with role = 'user'. We then promote it to Admin.
    UPDATE public.user_profiles
    SET
      name   = 'Super Admin',
      role   = 'Admin',
      status = 'active'
    WHERE user_id = v_admin_id;

    RAISE NOTICE 'Super Admin created: admin@1cng.com / Admin@1CNG2026!';
  ELSE
    RAISE NOTICE 'Super Admin already exists — skipping seed.';
  END IF;
END $$;
