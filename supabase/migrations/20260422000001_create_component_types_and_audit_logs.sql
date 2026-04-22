-- =============================================================
-- Create component_types table, audit_logs table, and add
-- missing RLS policies on regions.
-- Safe to re-run (idempotent with IF NOT EXISTS).
-- =============================================================

-- ── component_types ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.component_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  requires_specification boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.component_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read component types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'component_types' AND policyname = 'component_types_read'
  ) THEN
    CREATE POLICY "component_types_read"
    ON public.component_types FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Only admins can insert / update / delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'component_types' AND policyname = 'component_types_admin_write'
  ) THEN
    CREATE POLICY "component_types_admin_write"
    ON public.component_types FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- updated_at trigger
CREATE OR REPLACE TRIGGER update_component_types_updated_at
  BEFORE UPDATE ON public.component_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── audit_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text DEFAULT '—',
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_admin_read'
  ) THEN
    CREATE POLICY "audit_logs_admin_read"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin());
  END IF;
END $$;

-- Any authenticated user can insert an audit log entry
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert'
  ) THEN
    CREATE POLICY "audit_logs_insert"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- ── regions — add RLS if missing ──────────────────────────────
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'regions' AND policyname = 'regions_read'
  ) THEN
    CREATE POLICY "regions_read"
    ON public.regions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'regions' AND policyname = 'regions_admin_write'
  ) THEN
    CREATE POLICY "regions_admin_write"
    ON public.regions FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;
