-- Add push notification columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS push_token text,
ADD COLUMN IF NOT EXISTS push_permission_asked boolean DEFAULT false;