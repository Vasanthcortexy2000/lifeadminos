-- Add source_type and raw_text columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'file',
ADD COLUMN IF NOT EXISTS raw_text text;
