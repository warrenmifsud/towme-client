-- Add 'awaiting_payment' to request_status enum
-- This allows us to create a request that isn't visible to drivers yet

ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'pending';
