-- Add unique constraint on user_id so one profile per auth user
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Change column default from 'engineer' to 'user' for all new signups
ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'user';

-- Replace trigger function: new signups get role = 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        name,
        email,
        role,
        status
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        'user',
        'active'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
