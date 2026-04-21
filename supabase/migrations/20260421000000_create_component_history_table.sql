CREATE TABLE component_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    component_id uuid NOT NULL,
    movement_type text NOT NULL CHECK (movement_type IN ('CREATED', 'INSTALLED', 'UNINSTALLED', 'RELOCATED')),
    from_region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
    from_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
    from_device_id uuid,
    to_region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
    to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
    to_device_id uuid,
    moved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
    related_request_id uuid,
    related_request_type text CHECK (related_request_type IN ('install', 'relocation')),
    notes text DEFAULT '',
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_component_history_component_id ON component_history(component_id);
CREATE INDEX idx_component_history_moved_at ON component_history(moved_at DESC);

ALTER TABLE public.component_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view component history"
ON public.component_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert component history"
ON public.component_history
FOR INSERT
TO authenticated
WITH CHECK (true);
