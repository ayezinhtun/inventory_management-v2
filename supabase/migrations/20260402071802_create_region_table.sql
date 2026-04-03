CREATE TABLE regions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
    name text NOT NULL,
    description text,
    status text DEFAULT 'active', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_regions_name ON regions(name);
CREATE INDEX idx_regions_status ON regions(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();