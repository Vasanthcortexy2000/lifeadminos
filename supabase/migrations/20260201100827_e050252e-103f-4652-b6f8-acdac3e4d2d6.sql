-- Add steps column to obligations table to store extracted action steps
ALTER TABLE public.obligations 
ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb;