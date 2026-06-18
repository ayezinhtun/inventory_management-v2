-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_read_own') THEN
    CREATE POLICY notifications_read_own ON public.notifications
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Users can update (mark read) their own notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_update_own') THEN
    CREATE POLICY notifications_update_own ON public.notifications
      FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Allow authenticated users to insert notifications for other users
-- The sender_id must match the current user's ID
-- This enables the notification flow:
-- - Engineer creates request → sends to PMs (Engineer is sender)
-- - PM approves/rejects → sends to Admins/Engineer (PM is sender)
-- - Admin approves/rejects → sends to PMs/Engineer (Admin is sender)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_insert_as_sender') THEN
    CREATE POLICY notifications_insert_as_sender ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (sender_id = auth.uid());
  END IF;
END $$;

-- Service role can read/write all (for edge functions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_service_all') THEN
    CREATE POLICY notifications_service_all ON public.notifications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Admins can read all notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_admin_read') THEN
    CREATE POLICY notifications_admin_read ON public.notifications
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid() AND role = 'Admin'
        )
      );
  END IF;
END $$;

-- Admins can insert notifications for any user (additional flexibility)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications_admin_insert') THEN
    CREATE POLICY notifications_admin_insert ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid() AND role = 'Admin'
        )
      );
  END IF;
END $$;


-- For realtime notificaiton
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;