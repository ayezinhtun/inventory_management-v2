CREATE TABLE
    reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        component_id UUID NULL REFERENCES components (id) ON DELETE CASCADE,
        hardware_inventory_id UUID NULL REFERENCES hardware_inventory (id) ON DELETE CASCADE,
        reserved_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
        note TEXT NOT NULL,
        reserved_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT NOW (),
            released_at TIMESTAMP
        WITH
            TIME ZONE,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'released')),
            CHECK (
                (
                    component_id IS NOT NULL
                    AND hardware_inventory_id IS NULL
                )
                OR (
                    component_id IS NULL
                    AND hardware_inventory_id IS NOT NULL
                )
            )
    );

-- Indexes for performance
CREATE INDEX idx_reservations_component ON reservations (component_id);

CREATE INDEX idx_reservations_hardware ON reservations (hardware_inventory_id);

CREATE INDEX idx_reservations_reserved_by ON reservations (reserved_by);

CREATE INDEX idx_reservations_status ON reservations (status);


CREATE UNIQUE INDEX unique_active_component_reservation
ON reservations(component_id)
WHERE component_id IS NOT NULL AND status = 'active';

CREATE UNIQUE INDEX unique_active_inventory_reservation
ON reservations(hardware_inventory_id)
WHERE hardware_inventory_id IS NOT NULL AND status = 'active';

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reservations" ON reservations FOR
SELECT
    USING (auth.uid () = reserved_by);

CREATE POLICY "Users can insert their own reservations" ON reservations FOR INSERT
WITH
    CHECK (auth.uid () = reserved_by);

CREATE POLICY "Users can update their own reservations" ON reservations FOR
UPDATE USING (auth.uid () = reserved_by);

CREATE POLICY "Users can delete their own reservations" ON reservations FOR DELETE USING (auth.uid () = reserved_by);

