-- Add confidence column to obligations table for AI transparency
ALTER TABLE public.obligations 
ADD COLUMN IF NOT EXISTS confidence numeric(3,2) DEFAULT NULL;

COMMENT ON COLUMN public.obligations.confidence IS 'AI confidence score (0.0-1.0) for the extracted obligation';