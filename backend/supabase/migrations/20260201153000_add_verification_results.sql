-- Add verification persistence to driver_applications
ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS verification_score INT,
ADD COLUMN IF NOT EXISTS verification_report JSONB,
ADD COLUMN IF NOT EXISTS doc_analysis_results JSONB;
