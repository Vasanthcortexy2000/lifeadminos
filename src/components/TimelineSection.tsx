import { useState } from 'react';
import { Obligation, ObligationStatus, RiskLevel } from '@/types/obligation';
import { ObligationCard } from './ObligationCard';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface TimelineSectionProps {
  obligations: Obligation[];
  onStatusChange: (id: string, status: ObligationStatus) => void;
  className?: string;
}

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'urgency' | 'risk' | 'deadline';

const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

export function TimelineSection({ obligations, onStatusChange, className }: TimelineSectionProps) {
  const [filter, setFilter] = useState<FilterType>('active');
  const [sort, setSort] = useState<SortType>('urgency');

  const filteredObligations = obligations.filter(ob => {
    if (filter === 'all') return true;
    if (filter === 'completed') return ob.status === 'completed';
    return ob.status !== 'completed';
  });

  const sortedObligations = [...filteredObligations].sort((a, b) => {
    if (sort === 'deadline') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sort === 'risk') {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    // Urgency: combine risk and deadline
    const aScore = riskOrder[a.riskLevel] * 100 + (new Date(a.deadline).getTime() / 86400000);
    const bScore = riskOrder[b.riskLevel] * 100 + (new Date(b.deadline).getTime() / 86400000);
    return aScore - bScore;
  });

  const activeCount = obligations.filter(ob => ob.status !== 'completed').length;
  const completedCount = obligations.filter(ob => ob.status === 'completed').length;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Life Timeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} active {activeCount === 1 ? 'obligation' : 'obligations'}
            {completedCount > 0 && ` · ${completedCount} completed`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary rounded-lg p-1">
            {(['active', 'all', 'completed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-all duration-200',
                  filter === f
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-2 text-sm bg-secondary text-foreground rounded-lg border-0 focus:ring-2 focus:ring-primary"
          >
            <option value="urgency">Sort by urgency</option>
            <option value="deadline">Sort by deadline</option>
            <option value="risk">Sort by risk</option>
          </select>
        </div>
      </div>

      {sortedObligations.length === 0 ? (
        <EmptyState
          title={filter === 'completed' ? 'No completed obligations' : 'No obligations yet'}
          description={
            filter === 'completed'
              ? 'Completed obligations will appear here'
              : 'Upload a document to extract your obligations'
          }
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
