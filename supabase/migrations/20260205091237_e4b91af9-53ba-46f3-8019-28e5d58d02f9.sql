-- Fix RLS policy for obligation_shares - require token lookup instead of blanket access
DROP POLICY IF EXISTS "Anyone can look up shares by token" ON public.obligation_shares;

CREATE POLICY "Look up shares by specific token only"
ON public.obligation_shares
FOR SELECT
USING (
  -- Only allow lookup when the exact share_token is provided in the request
  share_token = current_setting('request.headers', true)::json->>'x-share-token'
  OR auth.uid() = user_id
);

-- Add DELETE policy for profiles (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE policy for obligation_evidence
CREATE POLICY "Users can update their own evidence"
ON public.obligation_evidence
FOR UPDATE
USING (auth.uid() = user_id);