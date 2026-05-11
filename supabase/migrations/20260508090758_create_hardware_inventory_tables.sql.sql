CREATE TABLE public.hardware_inventory (
  id                    uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  text          NOT NULL,
  item_type             text          NOT NULL,
  specifications        jsonb         NOT NULL DEFAULT '{}',
  manufacturer          text          NOT NULL DEFAULT '',
  model                 text          NOT NULL DEFAULT '',
  serial_number         text          NOT NULL DEFAULT '',
  asset_tag             text          NOT NULL DEFAULT '',
  status                text          NOT NULL DEFAULT 'available',
  condition             text          NOT NULL DEFAULT 'working',
  region_id             uuid          REFERENCES public.regions(id) ON DELETE SET NULL,
  warehouse_id          uuid          REFERENCES public.warehouses(id) ON DELETE SET NULL,
  created_by            uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  is_deleted            boolean       NOT NULL DEFAULT false
);

ALTER TABLE public.hardware_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hardware_inventory_read" ON public.hardware_inventory FOR SELECT TO authenticated USING (NOT is_deleted);
CREATE POLICY "hardware_inventory_insert" ON public.hardware_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hardware_inventory_update" ON public.hardware_inventory FOR UPDATE TO authenticated USING (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "hardware_inventory_delete" ON public.hardware_inventory FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_hardware_inventory_updated_at
  BEFORE UPDATE ON public.hardware_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();