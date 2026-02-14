-- OASR Telemetry Protocol: Live Driver Locations Table
-- Linked to Driver Applications for Active Roster Management

CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.driver_applications(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    heading DOUBLE PRECISION DEFAULT 0,
    speed DOUBLE PRECISION DEFAULT 0,
    status TEXT CHECK (status IN ('ONLINE', 'OFFLINE', 'BUSY', 'SIGNAL_LOST')) DEFAULT 'OFFLINE',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Telemetry Metadata
    device_id TEXT,
    app_version TEXT,
    battery_level INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read for Staff" ON public.driver_locations
    FOR SELECT TO authenticated
    USING (true); -- Simplified for now, refine later

CREATE POLICY "Drivers Update Own Location" ON public.driver_locations
    FOR ALL TO authenticated
    USING (auth.uid() IN (
        SELECT user_id FROM public.driver_applications WHERE id = driver_id
    ));

-- Indexes for Geo-Performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_status ON public.driver_locations(status);
CREATE INDEX IF NOT EXISTS idx_driver_locations_last_updated ON public.driver_locations(last_updated);

-- OASR Trigger: Auto-Update timestamp
CREATE OR REPLACE FUNCTION update_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_locations_timestamp
    BEFORE UPDATE ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_location_timestamp();
