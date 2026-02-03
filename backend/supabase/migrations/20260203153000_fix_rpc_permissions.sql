-- 1. Aggressively drop existing variations to clear any signature mismatches
-- This ensures that only the intended version of the function exists
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(float, float, int);
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(double precision, double precision, integer);
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(numeric, numeric, integer);

-- 2. Recreate with EXPLICIT types and no defaults to avoid PostgREST ambiguity
-- Parameter names must match exactly what is sent from the frontend ({ lat, lng, lim })
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
    extensions.st_asgeojson(ds.location)::jsonb as location,
    extensions.st_distance(ds.location, extensions.st_point(lng, lat)::geography) as distance
  FROM public.driver_status ds
  WHERE ds.is_online = true
  ORDER BY ds.location <-> extensions.st_point(lng, lat)::geography
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Explicitly grant permissions to all relevant roles
GRANT EXECUTE ON FUNCTION public.get_nearest_online_drivers(double precision, double precision, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_nearest_online_drivers(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearest_online_drivers(double precision, double precision, integer) TO service_role;

-- 4. Also ensure get_available_driver has correct permissions for redundancy
GRANT EXECUTE ON FUNCTION public.get_available_driver(float, float, uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_driver(float, float, uuid[]) TO authenticated;
