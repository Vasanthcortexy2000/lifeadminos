-- Allow anyone to view obligations that have an active share
CREATE POLICY "Anyone can view shared obligations"
ON public.obligations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.obligation_shares
    WHERE obligation_shares.obligation_id = obligations.id
    AND obligation_shares.revoked = false
    AND (obligation_shares.expires_at IS NULL OR obligation_shares.expires_at > now())
  )
);