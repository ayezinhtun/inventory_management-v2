-- =============================================================
-- 1. components table
-- 2. Fix audit_logs SELECT policy (non-admins can read own logs)
-- 3. Add fields column to component_types (idempotent)
-- =============================================================

-- ── audit_logs: fix SELECT policy ─────────────────────────────
-- Drop the admin-only policy and replace with one that also
-- lets each user read their own log entries.
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_read'
  ) THEN
    CREATE POLICY "audit_logs_read"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin() OR user_id = auth.uid());
  END IF;
END $$;

-- ── component_types: ensure fields column exists ──────────────
ALTER TABLE public.component_types
  ADD COLUMN IF NOT EXISTS fields jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── warehouses: ensure RLS ────────────────────────────────────
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'warehouses_read'
  ) THEN
    CREATE POLICY "warehouses_read"
    ON public.warehouses FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'warehouses_admin_write'
  ) THEN
    CREATE POLICY "warehouses_admin_write"
    ON public.warehouses FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;
