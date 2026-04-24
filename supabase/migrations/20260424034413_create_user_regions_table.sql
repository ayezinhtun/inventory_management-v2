CREATE TABLE IF NOT EXISTS public.user_regions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, 
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 


    UNIQUE(user_id, region_id)
);

ALTER TABLE public.user_regions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage user_regions"
    ON public.user_regions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

-- Indexes for performance
CREATE INDEX idx_user_regions_user_id ON public.user_regions(user_id);
CREATE INDEX idx_user_regions_region_id ON public.user_regions(region_id);

