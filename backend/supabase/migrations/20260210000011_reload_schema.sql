-- Migration: Force Schema Cache Reload
-- Date: 2026-02-10
-- Purpose: Notify PostgREST to reload schema cache to see new RPC

NOTIFY pgrst, 'reload config';
