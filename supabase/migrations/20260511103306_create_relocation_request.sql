-- Create relocation_requests table
CREATE TABLE IF NOT EXISTS public.relocation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_number TEXT NOT NULL UNIQUE,
    requester_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    relocation_type TEXT NOT NULL CHECK (relocation_type IN ('INVENTORY', 'COMPONENT')),
    inventory_id UUID REFERENCES public.hardware_inventory(id) ON DELETE CASCADE,
    component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    source_region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    source_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    destination_region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    destination_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    destination_server_id UUID REFERENCES public.hardware_inventory(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('Emergency', 'Critical', 'High', 'Medium', 'Low')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Pending PM Approval', 'Rejected by PM', 'Pending Admin Approval', 'Rejected by Admin', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Rolled Back')),
    pm_reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    pm_reviewed_at TIMESTAMP WITH TIME ZONE,
    pm_comments TEXT,
    admin_reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    admin_reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_comments TEXT,
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    completed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_relocation_requests_requester_id ON public.relocation_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_relocation_requests_status ON public.relocation_requests(status);

-- Enable RLS
ALTER TABLE public.relocation_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own relocation requests" ON public.relocation_requests
    FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "PMs and Admins can view all relocation requests" ON public.relocation_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('PM', 'Admin'))
    );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_relocation_requests_updated_at 
    BEFORE UPDATE ON public.relocation_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



ALTER TABLE public.relocation_requests 
ADD COLUMN source_server_id uuid NULL;

ALTER TABLE public.relocation_requests 
ADD CONSTRAINT relocation_requests_source_server_id_fkey 
FOREIGN KEY (source_server_id) REFERENCES hardware_inventory (id) ON DELETE SET NULL;


-- for policy relocation request
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own relocation requests" ON public.relocation_requests;
DROP POLICY IF EXISTS "PMs and Admins can view all relocation requests" ON public.relocation_requests;
DROP POLICY IF EXISTS "PMs and Admins can update all relocation requests" ON public.relocation_requests;

-- Create corrected policies
CREATE POLICY "Users can view own relocation requests" ON public.relocation_requests
    FOR SELECT USING (
        requester_id IN (
            SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "PMs and Admins can view all relocation requests" ON public.relocation_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('PM', 'Admin')
        )
    );

CREATE POLICY "Users and Admins can create relocation requests" ON public.relocation_requests
    FOR INSERT WITH CHECK (
        requester_id IN (
            SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY "Users can update own relocation requests" ON public.relocation_requests
    FOR UPDATE USING (
        requester_id IN (
            SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "PMs and Admins can update all relocation requests" ON public.relocation_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('PM', 'Admin')
        )
    );

CREATE POLICY "Authenticated users can read user profiles" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (true);
