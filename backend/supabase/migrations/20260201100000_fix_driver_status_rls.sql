-- Enable RLS just in case
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;

-- Allow drivers to update their own status
DROP POLICY IF EXISTS "Drivers can upsert their own status" ON driver_status;
CREATE POLICY "Drivers can upsert their own status"
ON driver_status
FOR ALL
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

-- Allow anyone (clients/admins) to read status
DROP POLICY IF EXISTS "Anyone can read driver status" ON driver_status;
CREATE POLICY "Anyone can read driver status"
ON driver_status
FOR SELECT
TO authenticated
USING (true);
