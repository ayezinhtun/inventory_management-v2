CREATE TABLE user_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY, 
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL, 
    email text NOT NULL, 
    role text DEFAULT 'engineer', 
    region_id uuid REFERENCES regions(id) ON DELETE SET NULL, 
    warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL, 
    status text DEFAULT 'active', 
    last_login_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view own profile 
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING(auth.uid() = user_id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own profile 
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at column
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN 
    INSERT INTO public.user_profiles(
        user_id, 
        name, 
        email, 
        role, 
        status
    )

    VALUES (
        new.id, 
        new.raw_user_meta_data->>'name',
        new.email, 
        'engineer', 
        'active'
    );
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
