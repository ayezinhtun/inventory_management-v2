CREATE TABLE public.components (
  id                    uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  text          NOT NULL,
  component_type_id     uuid          REFERENCES public.component_types(id) ON DELETE SET NULL,
  specifications        jsonb         NOT NULL DEFAULT '{}',
  manufacturer          text          NOT NULL DEFAULT '',
  model                 text          NOT NULL DEFAULT '',
  part_number           text          NOT NULL DEFAULT '',
  compatible_with       text          NOT NULL DEFAULT '',
  status                text          NOT NULL DEFAULT 'available',
  condition             text          NOT NULL DEFAULT 'working',
  region_id             uuid          REFERENCES public.regions(id) ON DELETE SET NULL,
  warehouse_id          uuid          REFERENCES public.warehouses(id) ON DELETE SET NULL,
  installed_in_device_id uuid          REFERENCES public.hardware_inventory(id) ON DELETE SET NULL,
  created_by            uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  is_deleted            boolean       NOT NULL DEFAULT false
);

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "components_read" ON public.components FOR SELECT TO authenticated USING (NOT is_deleted);
CREATE POLICY "components_insert" ON public.components FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "components_update" ON public.components FOR UPDATE TO authenticated USING (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "components_delete" ON public.components FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();