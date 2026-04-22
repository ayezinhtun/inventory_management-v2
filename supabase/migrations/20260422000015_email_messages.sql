-- =============================================================
-- Email Messages — internal mail system
-- Supports: inbox, sent, drafts, pending, failed, mail logs
-- =============================================================

-- ── email_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_messages (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id       uuid,
  sender_id       uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email    text          NOT NULL DEFAULT '',
  sender_name     text          NOT NULL DEFAULT '',
  subject         text          NOT NULL DEFAULT '(no subject)',
  body_html       text          NOT NULL DEFAULT '',
  body_text       text          NOT NULL DEFAULT '',
  -- draft | pending | sending | sent | failed | scheduled
  status          text          NOT NULL DEFAULT 'draft',
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  error_message   text,
  provider_id     text,
  is_system       boolean       NOT NULL DEFAULT false,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ── email_recipients ──────────────────────────────────────────
-- One row per (message × recipient). Drives inbox query.
CREATE TABLE IF NOT EXISTS public.email_recipients (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  uuid        NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email       text        NOT NULL,
  name        text        NOT NULL DEFAULT '',
  type        text        NOT NULL DEFAULT 'to',   -- to | cc | bcc
  is_read     boolean     NOT NULL DEFAULT false,
  read_at     timestamptz,
  is_deleted  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── mail_logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mail_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  uuid        REFERENCES public.email_messages(id) ON DELETE SET NULL,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  -- sent | received | read | draft_saved | failed | retried | deleted | scheduled
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_messages_sender    ON public.email_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status    ON public.email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_created   ON public.email_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_recipients_user    ON public.email_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_message ON public.email_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_user           ON public.mail_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_message        ON public.mail_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_created        ON public.mail_logs(created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.email_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_logs        ENABLE ROW LEVEL SECURITY;

-- email_messages: sender can read/update their own messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_messages' AND policyname='em_sender_access') THEN
    CREATE POLICY em_sender_access ON public.email_messages
      FOR ALL TO authenticated
      USING  (sender_id = auth.uid())
      WITH CHECK (sender_id = auth.uid());
  END IF;
END $$;

-- email_messages: admins can read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_messages' AND policyname='em_admin_read') THEN
    CREATE POLICY em_admin_read ON public.email_messages
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'Admin'
      ));
  END IF;
END $$;

-- email_messages: service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_messages' AND policyname='em_service_all') THEN
    CREATE POLICY em_service_all ON public.email_messages
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- email_recipients: recipient can read their own rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_recipients' AND policyname='er_recipient_read') THEN
    CREATE POLICY er_recipient_read ON public.email_recipients
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- email_recipients: recipient can update (mark read/deleted)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_recipients' AND policyname='er_recipient_update') THEN
    CREATE POLICY er_recipient_update ON public.email_recipients
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- email_recipients: sender can insert recipients for their messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_recipients' AND policyname='er_sender_insert') THEN
    CREATE POLICY er_sender_insert ON public.email_recipients
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.email_messages
        WHERE id = message_id AND sender_id = auth.uid()
      ));
  END IF;
END $$;

-- email_recipients: admins can read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_recipients' AND policyname='er_admin_read') THEN
    CREATE POLICY er_admin_read ON public.email_recipients
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'Admin'
      ));
  END IF;
END $$;

-- email_recipients: service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_recipients' AND policyname='er_service_all') THEN
    CREATE POLICY er_service_all ON public.email_recipients
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- mail_logs: users can read their own logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mail_logs' AND policyname='ml_own_read') THEN
    CREATE POLICY ml_own_read ON public.mail_logs
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- mail_logs: users can insert their own logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mail_logs' AND policyname='ml_own_insert') THEN
    CREATE POLICY ml_own_insert ON public.mail_logs
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- mail_logs: admins can read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mail_logs' AND policyname='ml_admin_read') THEN
    CREATE POLICY ml_admin_read ON public.mail_logs
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'Admin'
      ));
  END IF;
END $$;

-- mail_logs: service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mail_logs' AND policyname='ml_service_all') THEN
    CREATE POLICY ml_service_all ON public.mail_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
