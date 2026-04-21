-- ── Add new columns to user_profiles ─────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- ── Helper: check if current user is Admin (SECURITY DEFINER avoids RLS recursion) ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'Admin'
  );
$$;

-- ── RLS: Admins can view ALL user profiles ────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── RLS: Admins can update ANY user profile ───────────────────────────────
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ── User Activity Logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  actor_id   uuid        REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs
CREATE POLICY "Admins view all activity logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can view their own logs
CREATE POLICY "Users view own activity logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can insert (actor_id must be themselves, or caller is Admin)
CREATE POLICY "Users insert activity logs"
  ON public.user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS user_activity_logs_user_id_idx
  ON public.user_activity_logs (user_id, created_at DESC);

-- Enable realtime change tracking for online/offline indicators
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
