-- Migration: Grant Execute on Atomic Approval RPC
-- Date: 2026-02-10
-- Purpose: Allow client-side invocation

GRANT EXECUTE ON FUNCTION public.approve_driver_application(UUID) TO anon, authenticated, service_role;
