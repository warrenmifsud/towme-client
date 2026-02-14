-- URGENCT PURGE PROTOCOL [cite: 2026-02-10]
-- Compliance: Presidential Directive - Recursive Liquidation

-- 1. Purge by Specific ID (Confirmed via check_db.ts)
DELETE FROM public.driver_applications WHERE id = 'e2317c9b-c17b-4db6-bef0-531288ec17b2';

-- 2. Purge by Email (Safety Net)
DELETE FROM public.driver_applications WHERE email = 'warrenmifsud@gmail.com';

-- 3. Purge orphaned references in related tables (Constraint Safety)
-- If these tables reference driver_applications, we need to clear them too or rely on CASCADE.
-- Assuming no strict FK blocking standard DELETE on driver_applications, or CASCADE is set.
-- Just in case:
DELETE FROM public.driver_status WHERE driver_id IN (SELECT id FROM auth.users WHERE email = 'warrenmifsud@gmail.com');
