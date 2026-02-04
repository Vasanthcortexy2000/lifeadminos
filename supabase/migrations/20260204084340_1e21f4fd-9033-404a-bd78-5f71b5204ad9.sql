-- Allow anyone (including unauthenticated users) to look up a share by its token
-- This is needed so visitors with a share link can verify the token and get the obligation_id
CREATE POLICY "Anyone can look up shares by token"
ON public.obligation_shares
FOR SELECT
USING (true);

-- Note: The sensitive operations (INSERT, UPDATE, DELETE) remain restricted to the share owner
-- via the existing "Users can manage their own shares" policy