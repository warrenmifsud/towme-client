-- Migration: Add 'driver' to user_role enum
-- Date: 2026-02-10
-- Purpose: Ensure 'driver' role exists for profile promotion

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'driver') THEN
        ALTER TYPE public.user_role ADD VALUE 'driver';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
