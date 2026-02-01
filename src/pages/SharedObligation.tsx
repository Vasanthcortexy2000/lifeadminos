import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RiskBadge } from '@/components/RiskBadge';
import { DueDateBadge } from '@/components/DueDateBadge';
import { DomainBadge, LifeDomain } from '@/components/LifeDomain';
import { RiskLevel } from '@/types/obligation';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileText, Lock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface SharedObligation {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  risk_level: string;
  status: string;
  consequence: string | null;
  steps: string[] | null;
  domain: string | null;
  source_document: string | null;
  created_at: string;
}

export default function SharedObligation() {
  const { token } = useParams<{ token: string }>();
  const [obligation, setObligation] = useState<SharedObligation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedObligation = async () => {
      if (!token) {
        setError('No share token provided');
        setLoading(false);
        return;
      }

      try {
        // First get the share record
        const { data: shareData, error: shareError } = await supabase
          .from('obligation_shares')
          .select('obligation_id, revoked, expires_at')
          .eq('share_token', token)
          .maybeSingle();

        if (shareError) throw shareError;

        if (!shareData) {
          setError('This link is invalid or has expired');
          setLoading(false);
          return;
        }

        if (shareData.revoked) {
          setError('This link has been revoked');
          setLoading(false);
          return;
        }

        if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
          setError('This link has expired');
          setLoading(false);
          return;
        }

        // Fetch the obligation details (using service role would be needed in production)
        // For now, we'll use a public RPC or edge function
        const { data: obligationData, error: obligationError } = await supabase
          .from('obligations')
          .select('id, title, description, deadline, risk_level, status, consequence, steps, domain, source_document, created_at')
          .eq('id', shareData.obligation_id)
          .maybeSingle();

        if (obligationError) throw obligationError;

        if (!obligationData) {
          setError('The obligation no longer exists');
          setLoading(false);
          return;
        }

        setObligation({
          ...obligationData,
          steps: Array.isArray(obligationData.steps) ? obligationData.steps as string[] : null,
        });
      } catch (err) {
        console.error('Error fetching shared obligation:', err);
        setError('Unable to load this obligation');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedObligation();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Unable to access
          </h1>
          <p className="text-muted-foreground">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!obligation) return null;

  const isCompleted = obligation.status === 'completed';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Shared view • Read only
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Life Admin OS
          </h1>
        </div>

        {/* Obligation Card */}
        <div className="card-calm p-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <RiskBadge level={obligation.risk_level as RiskLevel} />
            <DueDateBadge deadline={obligation.deadline ? new Date(obligation.deadline) : null} />
            {obligation.domain && obligation.domain !== 'general' && (
              <DomainBadge domain={obligation.domain as LifeDomain} />
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-[hsl(var(--status-completed))]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {obligation.title}
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-4">
            {obligation.description}
          </p>

          {/* Consequence */}
          {obligation.consequence && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary mb-4">
              <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">
                {obligation.consequence}
              </span>
            </div>
          )}

          {/* Steps */}
          {obligation.steps && obligation.steps.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Steps</h3>
              <ul className="space-y-2">
                {obligation.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source */}
          {obligation.source_document && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-4 border-t border-border">
              <FileText className="w-3.5 h-3.5" />
              <span>From: {obligation.source_document}</span>
              <span className="text-muted-foreground/60">
                · Added {format(new Date(obligation.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          This is a read-only view. The owner can revoke access at any time.
        </p>
      </div>
    </div>
  );
}
