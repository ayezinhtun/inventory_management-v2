CREATE TABLE IF NOT EXISTS public.user_warehouses (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, 
     warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE, 
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 

     UNIQUE(user_id, warehouse_id)
);

-- Enable RLS
ALTER TABLE public.user_warehouses ENABLE ROW LEVEL SECURITY;

-- RLS Policies 
CREATE POLICY "Admin can manage user_warehouses"
    ON public.user_warehouses
    FOR ALL
    To authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

-- Indexes
CREATE INDEX idx_user_warehouses_user_id ON public.user_warehouses(user_id);
CREATE INDEX idx_user_warehouses_warehouse_id ON public.user_warehouses(warehouse_id);