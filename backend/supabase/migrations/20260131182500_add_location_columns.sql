-- 1. Add missing geography columns to towing_requests
-- The client tries to insert 'pickup_location' but it doesn't exist yet.

ALTER TABLE public.towing_requests 
ADD COLUMN IF NOT EXISTS pickup_location geography(POINT),
ADD COLUMN IF NOT EXISTS dropoff_location geography(POINT);

-- 2. Index for spatial queries
CREATE INDEX IF NOT EXISTS towing_requests_pickup_idx ON public.towing_requests USING GIST (pickup_location);

-- 3. Backfill data from existing lat/long
UPDATE public.towing_requests
SET 
  pickup_location = ST_SetSRID(ST_Point(pickup_long, pickup_lat), 4326)::geography,
  dropoff_location = CASE 
    WHEN dropoff_long IS NOT NULL AND dropoff_lat IS NOT NULL 
    THEN ST_SetSRID(ST_Point(dropoff_long, dropoff_lat), 4326)::geography 
    ELSE NULL 
  END
WHERE pickup_location IS NULL;

-- 4. Trigger to keep them in sync (Optional but recommended)
CREATE OR REPLACE FUNCTION public.sync_towing_request_locations()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync pickup
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_long IS NOT NULL THEN
    NEW.pickup_location := ST_SetSRID(ST_Point(NEW.pickup_long, NEW.pickup_lat), 4326)::geography;
  END IF;

  -- Sync dropoff
  IF NEW.dropoff_lat IS NOT NULL AND NEW.dropoff_long IS NOT NULL THEN
    NEW.dropoff_location := ST_SetSRID(ST_Point(NEW.dropoff_long, NEW.dropoff_lat), 4326)::geography;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_towing_locations ON public.towing_requests;
CREATE TRIGGER trg_sync_towing_locations
BEFORE INSERT OR UPDATE ON public.towing_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_towing_request_locations();
