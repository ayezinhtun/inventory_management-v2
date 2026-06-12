ALTER TABLE public.hardware_inventory 
ADD COLUMN hostname text NOT NULL DEFAULT '';


ALTER TABLE public.components 
ADD COLUMN hostname text NOT NULL DEFAULT '';


-- for user policy update
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());


-- for doing warehouse id fk as delete restric in user warehouse table
ALTER TABLE public.user_warehouses 
DROP CONSTRAINT IF EXISTS user_warehouses_warehouse_id_fkey;

ALTER TABLE public.user_warehouses
ADD CONSTRAINT user_warehouses_warehouse_id_fkey 
FOREIGN KEY (warehouse_id) 
REFERENCES public.warehouses(id) 
ON DELETE RESTRICT;


-- for update model column in component as nullable  
ALTER TABLE public.components 
ALTER COLUMN model DROP NOT NULL;


-- for doing warehouse id and region id fk as delete restrict
ALTER TABLE public.components 
DROP CONSTRAINT IF EXISTS components_region_id_fkey;

ALTER TABLE public.components
ADD CONSTRAINT components_region_id_fkey 
FOREIGN KEY (region_id) 
REFERENCES public.regions(id) 
ON DELETE RESTRICT;


ALTER TABLE public.components 
DROP CONSTRAINT IF EXISTS components_warehouse_id_fkey;

ALTER TABLE public.components
ADD CONSTRAINT components_warehouse_id_fkey 
FOREIGN KEY (warehouse_id) 
REFERENCES public.warehouses(id) 
ON DELETE RESTRICT;



-- for rls policy in notification

-- Enable RLS on notifications table
ALTER TABLE public.notifications 
ADD COLUMN related_relocation_request_id UUID REFERENCES public.relocation_requests(id) ON DELETE CASCADE;


DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_pm_see_submitted ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_see_pending_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_pm_see_approved ON public.notifications;
DROP POLICY IF EXISTS notifications_pm_see_rejected_by_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_see_submitted_from_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_pm_see_submitted_from_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_see_rejected_by_pm ON public.notifications;
DROP POLICY IF EXISTS notifications_service_all ON public.notifications; 
DROP POLICY IF EXISTS notifications_admin_read ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;

-- Policy 1: Users can always read their own notifications
CREATE POLICY notifications_read_own ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Policy 2: Users can update (mark read) their own notifications  
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Policy 3: PMs can see notifications for 'Submitted' status (Engineer created)
CREATE POLICY notifications_pm_see_submitted ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Submitted'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'PM'
    )
  );

-- Policy 4: Admins can see notifications for 'Pending Admin Approval' (PM approved)
CREATE POLICY notifications_admin_see_pending_admin ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Pending Admin Approval'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'Admin'
    )
  );

-- Policy 5: PMs can see notifications for 'Approved' status (Admin approved engineer request)
CREATE POLICY notifications_pm_see_approved ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Approved'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'PM'
    )
  );

-- Policy 6: PMs can see notifications for 'Rejected by Admin' status
CREATE POLICY notifications_pm_see_rejected_by_admin ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Rejected by Admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'PM'
    )
  );

-- Policy 7: Admins can see notifications for 'Submitted' status from Admins
CREATE POLICY notifications_admin_see_submitted_from_admin ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      JOIN public.user_profiles requester ON requester.id = rr.requester_id
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Submitted'
      AND requester.role = 'Admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'Admin'
    )
  );

-- Policy 8: PMs can see notifications for 'Submitted' status from Admins
CREATE POLICY notifications_pm_see_submitted_from_admin ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      JOIN public.user_profiles requester ON requester.id = rr.requester_id
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Submitted'
      AND requester.role = 'Admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'PM'
    )
  );

-- Policy 9: Admins can see notifications for 'Rejected by PM' status
CREATE POLICY notifications_admin_see_rejected_by_pm ON public.notifications
  FOR SELECT TO authenticated
  USING (
    related_relocation_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.relocation_requests rr
      WHERE rr.id = related_relocation_request_id
      AND rr.status = 'Rejected by PM'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'Admin'
    )
  );

-- Policy 10: Service role full access
CREATE POLICY notifications_service_all ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy 11: Admins can insert notifications
CREATE POLICY notifications_admin_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );