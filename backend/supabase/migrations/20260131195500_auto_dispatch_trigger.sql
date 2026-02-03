-- Add a trigger to automatically attempt dispatch when a job is set to 'pending'
-- This ensures that if the frontend call fails, the DB handles it.

CREATE OR REPLACE FUNCTION public.handle_pending_job_dispatch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status <> 'pending') THEN
    PERFORM public.dispatch_job(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_dispatch ON public.towing_requests;
CREATE TRIGGER trg_auto_dispatch
AFTER INSERT OR UPDATE OF status ON public.towing_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_pending_job_dispatch();
