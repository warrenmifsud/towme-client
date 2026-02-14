-- Add LANA support columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS drivetrain TEXT CHECK (drivetrain IN ('AWD', 'RWD', 'FWD', '4x4', 'Unknown')),
ADD COLUMN IF NOT EXISTS curb_weight INTEGER, -- In KG
ADD COLUMN IF NOT EXISTS is_low_clearance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wheels_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transmission TEXT CHECK (transmission IN ('Auto', 'Manual', 'Unknown')),
ADD COLUMN IF NOT EXISTS operational_status TEXT DEFAULT 'operational';

-- Add constraint for unique VIN per client (optional, maybe not unique globally as multiple people can drive same car, but usually unique per profile-vehicle combo? Let's keep it simple for now)
-- No unique constraint on VIN for now to avoid friction.

-- Add comment
COMMENT ON COLUMN public.vehicles.vin IS 'Vehicle Identification Number';
COMMENT ON COLUMN public.vehicles.drivetrain IS 'AWD, RWD, FWD, 4x4';
