-- =============================================================
-- Notifications & Email Logs
-- Supports in-app notifications (stored in DB) and email tracking.
-- =============================================================

-- ── notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text          NOT NULL,
  message       text          NOT NULL,
  type          text          NOT NULL DEFAULT 'info',
  -- 'info' | 'warning' | 'alert' | 'success'
  category      text          NOT NULL DEFAULT 'system',
  -- 'system' | 'inventory' | 'component' | 'user' | 'email' | 'low_stock'
  region_id     uuid          REFERENCES public.regions(id) ON DELETE SET NULL,
  warehouse_id  uuid          REFERENCES public.warehouses(id) ON DELETE SET NULL,
  is_read       boolean       NOT NULL DEFAULT false,
  action_url    text,
  sender_id     uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- ── email_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email        text        NOT NULL,
  to_user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  subject         text        NOT NULL,
  html_body       text,
  status          text        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'sent' | 'failed'
  provider        text        NOT NULL DEFAULT 'resend',
  provider_id     text,
  error_message   text,
  notification_id uuid        REFERENCES public.notifications(id) ON DELETE SET NULL,
  region_id       uuid        REFERENCES public.regions(id) ON DELETE SET NULL,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── notification_templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text    NOT NULL UNIQUE,
  subject     text    NOT NULL,
  html_body   text    NOT NULL,
  category    text    NOT NULL DEFAULT 'system',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status       ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created      ON public.email_logs(created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

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

-- Admins can insert notifications for any user
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

-- Email logs: service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_logs' AND policyname='email_logs_service_all') THEN
    CREATE POLICY email_logs_service_all ON public.email_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Email logs: admins can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_logs' AND policyname='email_logs_admin_read') THEN
    CREATE POLICY email_logs_admin_read ON public.email_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid() AND role = 'Admin'
        )
      );
  END IF;
END $$;

-- Email logs: admins can insert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_logs' AND policyname='email_logs_admin_insert') THEN
    CREATE POLICY email_logs_admin_insert ON public.email_logs
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid() AND role = 'Admin'
        )
      );
  END IF;
END $$;

-- Templates: anyone authenticated can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_templates' AND policyname='templates_read') THEN
    CREATE POLICY templates_read ON public.notification_templates
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Templates: only admins can modify
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_templates' AND policyname='templates_admin_write') THEN
    CREATE POLICY templates_admin_write ON public.notification_templates
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid() AND role = 'Admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid() AND role = 'Admin'
        )
      );
  END IF;
END $$;

-- ── Seed default templates ────────────────────────────────────
INSERT INTO public.notification_templates (name, subject, html_body, category) VALUES
(
  'low_stock_alert',
  'Low Stock Alert — {{item_name}}',
  '<h2>Low Stock Warning</h2><p>Component <strong>{{item_name}}</strong> in <strong>{{region_name}}</strong> is running low.</p><p>Current quantity: <strong>{{quantity}}</strong> / Minimum: <strong>{{minimum_stock}}</strong></p><p>Please reorder as soon as possible.</p>',
  'inventory'
),
(
  'monthly_summary',
  'Monthly Inventory Summary — {{month_year}}',
  '<h2>Monthly Inventory Report</h2><p>Here is your inventory summary for <strong>{{month_year}}</strong>.</p><ul><li>Total Components: {{total_components}}</li><li>Low Stock Items: {{low_stock_count}}</li><li>Broken Components: {{broken_count}}</li><li>Total Asset Value: {{asset_value}}</li></ul>',
  'system'
),
(
  'welcome',
  'Welcome to IMS — Your account is ready',
  '<h2>Welcome to IMS!</h2><p>Hi <strong>{{name}}</strong>, your account has been set up.</p><p>You can now log in at <a href="{{app_url}}">{{app_url}}</a> using your credentials.</p>',
  'user'
)
ON CONFLICT (name) DO NOTHING;
