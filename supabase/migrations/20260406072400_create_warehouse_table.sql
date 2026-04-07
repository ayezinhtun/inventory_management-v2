CREATE TABLE warehouses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, 
    name text not null, 
    region_id uuid not null REFERENCES regions(id) on delete restrict, 
    address text, 
    contact_person text, 
    phone text, 
    status text DEFAULT 'active', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;


CREATE INDEX idx_warehouse_name ON warehouses(name);
CREATE INDEX idx_warehouse_status ON warehouses(status);

CREATE POLICY "Allow read for authenticated users"
ON public.warehouses
FOR select
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for authenticated users"
ON public.warehouses
FOR insert
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.warehouses
FOR update
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users"
ON public.warehouses
FOR delete
TO authenticated
USING (true);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_warehouses_updated_at 
    BEFORE UPDATE ON warehouses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();