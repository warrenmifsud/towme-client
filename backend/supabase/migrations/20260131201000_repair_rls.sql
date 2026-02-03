-- RLS REPAIR: Towing Requests
-- Ensure drivers can ALWAYS see jobs assigned to them, even if check_is_driver fails.

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Drivers can view available and assigned requests" ON public.towing_requests;
DROP POLICY IF EXISTS "Drivers can accept and update their requests" ON public.towing_requests;
DROP POLICY IF EXISTS "Drivers can update assigned requests" ON public.towing_requests;

-- 2. Create optimized, high-reliability policies

-- SELECT: Can see if it's pending OR assigned to you
CREATE POLICY "Drivers can view available and assigned requests"
ON public.towing_requests FOR SELECT
USING (
  (status = 'pending') -- Anyone can see pending to try and accept
  OR (auth.uid() = driver_id) -- Always see your own assigned jobs
);

-- UPDATE: Can update if it's pending (to accept it) OR assigned to you
CREATE POLICY "Drivers can update assigned requests"
ON public.towing_requests FOR UPDATE
USING (
  (status = 'pending')
  OR (auth.uid() = driver_id)
)
WITH CHECK (
  (auth.uid() = driver_id) -- Can only set themselves as driver or update their own
);

-- 3. Ensure profiles are readable (needed for some logic)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING ( true );
