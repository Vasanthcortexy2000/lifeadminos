import { Obligation, ObligationStatus, RiskLevel } from '@/types/obligation';
import { ObligationCard } from './ObligationCard';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface TimelineSectionProps {
  obligations: Obligation[];
  onStatusChange: (id: string, status: ObligationStatus) => void;
  className?: string;
}

// Risk level priority: high = 0, medium = 1, low = 2
const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

export function TimelineSection({ obligations, onStatusChange, className }: TimelineSectionProps) {
  // Sort obligations: risk_level (high → medium → low), then due_date soonest first (nulls last)
  const sortedObligations = [...obligations].sort((a, b) => {
    // First sort by risk level
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;

    // Then sort by due date (soonest first, nulls last)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const activeCount = obligations.filter(ob => ob.status !== 'completed').length;

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Life Timeline</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activeCount} active {activeCount === 1 ? 'obligation' : 'obligations'}
        </p>
      </div>

      {sortedObligations.length === 0 ? (
        <EmptyState
          title="Nothing urgent right now."
          description="Upload a document and I'll extract any actions."
        />
      ) : (
        <div className="space-y-4">
          {sortedObligations.map((obligation, index) => (
            <div
              key={obligation.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ObligationCard
                obligation={obligation}
                onStatusChange={onStatusChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
