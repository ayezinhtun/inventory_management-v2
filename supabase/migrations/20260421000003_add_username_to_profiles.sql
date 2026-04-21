-- Add optional username field to user_profiles for display purposes
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Unique partial index: two users cannot share the same username,
-- but NULL (not yet set) is allowed for many rows.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_key
  ON public.user_profiles (username)
  WHERE username IS NOT NULL;

-- Expose username in the auto-updated_at trigger (no change needed — trigger
-- already fires on all UPDATE statements to the table).
