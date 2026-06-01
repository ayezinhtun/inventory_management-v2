-- =============================================================
-- 1. components table
-- 2. Fix audit_logs SELECT policy (non-admins can read own logs)
-- 3. Add fields column to component_types (idempotent)
-- =============================================================

-- ── components ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.components (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name            text NOT NULL,
  component_type_id    uuid REFERENCES public.component_types(id) ON DELETE SET NULL,
  manufacturer         text NOT NULL DEFAULT '',
  model                text NOT NULL DEFAULT '',
  part_number          text NOT NULL DEFAULT '',
  specifications       jsonb NOT NULL DEFAULT '{}',
  region_id            uuid REFERENCES public.regions(id) ON DELETE RESTRICT,
  warehouse_id         uuid REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  bin_location         text NOT NULL DEFAULT '',
  quantity             integer NOT NULL DEFAULT 1,
  reserved_quantity    integer NOT NULL DEFAULT 0,
  minimum_stock        integer NOT NULL DEFAULT 0,
  reorder_quantity     integer NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'Working',
  condition            text NOT NULL DEFAULT 'New',
  tested               boolean NOT NULL DEFAULT false,
  test_date            date,
  test_results         text NOT NULL DEFAULT '',
  purchase_date        date,
  purchase_price       numeric(12,2),
  vendor               text NOT NULL DEFAULT '',
  purchase_order_number text NOT NULL DEFAULT '',
  warranty_type        text NOT NULL DEFAULT '',
  warranty_expiry_date date,
  compatible_with      text NOT NULL DEFAULT '',
  notes                text NOT NULL DEFAULT '',
  tags                 text[] NOT NULL DEFAULT '{}',
  barcode              text NOT NULL DEFAULT '',
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  is_deleted           boolean NOT NULL DEFAULT false
);

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read non-deleted components
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'components' AND policyname = 'components_read'
  ) THEN
    CREATE POLICY "components_read"
    ON public.components FOR SELECT TO authenticated
    USING (NOT is_deleted);
  END IF;
END $$;

-- All authenticated users can insert components
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'components' AND policyname = 'components_insert'
  ) THEN
    CREATE POLICY "components_insert"
    ON public.components FOR INSERT TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Admins or the creator can update
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'components' AND policyname = 'components_update'
  ) THEN
    CREATE POLICY "components_update"
    ON public.components FOR UPDATE TO authenticated
    USING (public.is_admin() OR created_by = auth.uid());
  END IF;
END $$;

-- updated_at trigger
CREATE OR REPLACE TRIGGER update_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
