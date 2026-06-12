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

