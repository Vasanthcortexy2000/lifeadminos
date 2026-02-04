import { useMemo, useState, useEffect } from 'react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus, getDaysUntilDue, formatDueStatus } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Star, X } from 'lucide-react';
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
      
      // High priority AND due within 7 days (or past due)
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
      {urgentItems.map(item => {
        const status = getDueDateStatus(item.deadline);
        const isOverdue = status === 'overdue';
        
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border",
              isOverdue 
                ? "bg-[hsl(var(--priority-high-bg))] border-[hsl(var(--priority-high))]/20"
                : "bg-secondary border-border/50"
            )}
          >
            <Star className={cn(
              "w-5 h-5 flex-shrink-0 mt-0.5",
              isOverdue ? "text-[hsl(var(--priority-high))]" : "text-[hsl(var(--priority-medium))]"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isOverdue 
                  ? `When you're ready — ${item.title.toLowerCase()}`
                  : `Heads up — ${item.title.toLowerCase()} is coming up`
                }
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
        );
      })}
    </div>
  );
}
