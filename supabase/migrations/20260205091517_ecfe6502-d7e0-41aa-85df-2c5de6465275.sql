-- Replace the problematic policy with a simpler, safer approach
-- The share lookup should happen via code, not via open RLS
DROP POLICY IF EXISTS "Look up shares by specific token only" ON public.obligation_shares;

-- Only allow users to see their own shares
-- Public token lookups will happen through an edge function with service role
CREATE POLICY "Users can view their own shares"
ON public.obligation_shares
FOR SELECT
USING (auth.uid() = user_id);