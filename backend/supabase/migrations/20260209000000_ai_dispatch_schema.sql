-- AI Dispatch & B2B Logistics Schema

-- 1. Create table `current_queue` to track driver logistics state
CREATE TABLE IF NOT EXISTS public.current_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_job_id UUID REFERENCES public.towing_requests(id) ON DELETE SET NULL,
    estimated_finish_time TIMESTAMPTZ,
    seconds_to_finish INTEGER, -- AI Calculated Remaining Duration
    status TEXT CHECK (status IN ('active', 'finishing_previous', 'available')) DEFAULT 'active',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for `current_queue`
ALTER TABLE public.current_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can view their own queue status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'current_queue' AND policyname = 'Drivers can view own queue'
    ) THEN
        CREATE POLICY "Drivers can view own queue" ON public.current_queue
            FOR SELECT USING (auth.uid() = driver_id);
    END IF;
END $$;

-- Policy: Drivers can updated their own queue status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'current_queue' AND policyname = 'Drivers can update own queue'
    ) THEN
        CREATE POLICY "Drivers can update own queue" ON public.current_queue
            FOR UPDATE USING (auth.uid() = driver_id);
    END IF;
END $$;

-- Policy: Admins/Dispatchers can view all queues
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'current_queue' AND policyname = 'Staff can view all queues'
    ) THEN
        CREATE POLICY "Staff can view all queues" ON public.current_queue
            FOR SELECT USING ((select is_staff()));
    END IF;
END $$;


-- 2. Update `driver_status` table
ALTER TABLE public.driver_status
ADD COLUMN IF NOT EXISTS is_eligible_for_b2b BOOLEAN DEFAULT FALSE;

-- Add index for performance on status checks
CREATE INDEX IF NOT EXISTS idx_current_queue_driver_id ON public.current_queue(driver_id);
CREATE INDEX IF NOT EXISTS idx_current_queue_status ON public.current_queue(status);
