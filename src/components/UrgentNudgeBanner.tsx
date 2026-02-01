import { useMemo, useState, useEffect } from 'react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus, getDaysUntilDue, formatDueStatus } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UrgentNudgeBannerProps {
  obligations: Obligation[];
  className?: string;
}

const DISMISSED_KEY = 'lifeadmin_dismissed_nudges';

function getDismissedNudges(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Clean up old dismissals (older than 24 hours)
      const now = Date.now();
      const valid = Object.entries(parsed).filter(
        ([_, timestamp]) => now - (timestamp as number) < 24 * 60 * 60 * 1000
      );
      return new Set(valid.map(([id]) => id));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function dismissNudge(obligationId: string) {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[obligationId] = Date.now();
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors
  }
}

export function UrgentNudgeBanner({ obligations, className }: UrgentNudgeBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(getDismissedNudges());
  }, []);

  const urgentItems = useMemo(() => {
    return obligations.filter(ob => {
      if (ob.status === 'completed') return false;
      if (dismissed.has(ob.id)) return false;
      
      const status = getDueDateStatus(ob.deadline);
      const days = getDaysUntilDue(ob.deadline);
      
      // High risk AND due within 7 days (or overdue)
      return ob.riskLevel === 'high' && (status === 'overdue' || (days !== null && days <= 7));
    }).slice(0, 2); // Max 2 nudges at a time
  }, [obligations, dismissed]);

  const handleDismiss = (obligationId: string) => {
    dismissNudge(obligationId);
    setDismissed(prev => new Set([...prev, obligationId]));
  };

  if (urgentItems.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {urgentItems.map(item => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--risk-high-bg))] border border-[hsl(var(--risk-high))]/20"
        >
          <AlertTriangle className="w-5 h-5 text-[hsl(var(--risk-high))] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Heads up — {item.title.toLowerCase()} is coming up soon.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDueStatus(item.deadline)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(item.id)}
            className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
