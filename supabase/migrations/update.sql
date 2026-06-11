ALTER TABLE public.hardware_inventory 
ADD COLUMN hostname text NOT NULL DEFAULT '';


ALTER TABLE public.components 
ADD COLUMN hostname text NOT NULL DEFAULT '';