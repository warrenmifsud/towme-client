-- Fix RPC 404 Error - Corrected PostGIS Function Usage
-- The issue was using extensions.st_asgeojson which doesn't exist
-- We need to use ST_AsGeoJSON from the public schema or cast properly

-- 1. Drop all existing variations
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(float, float, int);
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(double precision, double precision, integer);
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(numeric, numeric, integer);

-- 2. Recreate with CORRECT PostGIS function usage
CREATE OR REPLACE FUNCTION public.get_nearest_online_drivers(
  lat double precision, 
  lng double precision, 
  lim integer
)
RETURNS TABLE (
  driver_id uuid,
  location jsonb,
  distance float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.driver_id,
    -- Use ST_AsGeoJSON from public schema, cast geography to geometry first
    public.ST_AsGeoJSON(ds.location::geometry)::jsonb as location,
    public.ST_Distance(ds.location, public.ST_Point(lng, lat)::geography) as distance
  FROM public.driver_status ds
  WHERE ds.is_online = true
  ORDER BY ds.location <-> public.ST_Point(lng, lat)::geography
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_nearest_online_drivers(double precision, double precision, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_nearest_online_drivers(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearest_online_drivers(double precision, double precision, integer) TO service_role;

-- 4. Also fix get_available_driver if it has the same issue
DROP FUNCTION IF EXISTS public.get_available_driver(float, float, uuid[]);
DROP FUNCTION IF EXISTS public.get_available_driver(double precision, double precision, uuid[]);

CREATE OR REPLACE FUNCTION public.get_available_driver(
  lat double precision,
  lng double precision,
  excluded_drivers uuid[]
)
RETURNS TABLE (
  driver_id uuid,
  location jsonb,
  distance float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.driver_id,
    -- Use ST_AsGeoJSON from public schema, cast geography to geometry first
    public.ST_AsGeoJSON(ds.location::geometry)::jsonb as location,
    public.ST_Distance(ds.location, public.ST_Point(lng, lat)::geography) as distance
  FROM public.driver_status ds
  WHERE ds.is_online = true
    AND ds.driver_id != ALL(excluded_drivers)
  ORDER BY ds.location <-> public.ST_Point(lng, lat)::geography
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for get_available_driver
GRANT EXECUTE ON FUNCTION public.get_available_driver(double precision, double precision, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_driver(double precision, double precision, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_driver(double precision, double precision, uuid[]) TO service_role;
