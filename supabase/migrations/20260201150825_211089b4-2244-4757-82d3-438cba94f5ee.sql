-- Add domain column for life categorization
ALTER TABLE public.obligations ADD COLUMN domain TEXT DEFAULT 'general';

-- Create index for filtering by domain
CREATE INDEX idx_obligations_domain ON public.obligations (domain);

-- Create evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);

-- RLS policies for evidence bucket
CREATE POLICY "Users can view their own evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create evidence table to track attachments
CREATE TABLE public.obligation_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  obligation_id UUID NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on evidence table
ALTER TABLE public.obligation_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evidence"
ON public.obligation_evidence FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evidence"
ON public.obligation_evidence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evidence"
ON public.obligation_evidence FOR DELETE
USING (auth.uid() = user_id);

-- Create shares table for trusted person access
CREATE TABLE public.obligation_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  obligation_id UUID NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on shares table
ALTER TABLE public.obligation_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shares"
ON public.obligation_shares FOR ALL
USING (auth.uid() = user_id);

-- Add reminder preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN reminder_enabled BOOLEAN DEFAULT true,
ADD COLUMN email_reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN reminder_timing_high INTEGER DEFAULT 7,
ADD COLUMN reminder_timing_medium INTEGER DEFAULT 3,
ADD COLUMN reminder_timing_low INTEGER DEFAULT 1;

-- Create index for share tokens
CREATE INDEX idx_shares_token ON public.obligation_shares (share_token) WHERE revoked = false;