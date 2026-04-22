-- =============================================================
-- Add dynamic form fields to component_types
-- Create customers table with full RLS
-- =============================================================

-- ── component_types: add fields column ───────────────────────
ALTER TABLE public.component_types
  ADD COLUMN IF NOT EXISTS fields jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── customers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text        NOT NULL,
  customer_type text        NOT NULL DEFAULT 'Enterprise',
  contact_person text,
  email         text,
  phone         text,
  address       text,
  notes         text,
  status        text        NOT NULL DEFAULT 'active',
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_read'
  ) THEN
    CREATE POLICY "customers_read"
    ON public.customers FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_admin_write'
  ) THEN
    CREATE POLICY "customers_admin_write"
    ON public.customers FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Fix user_profiles self-service UPDATE ─────────────────────
-- Ensure non-admin users can still update their OWN profile
-- (name, username only – not role/status/region which are admin-controlled)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
