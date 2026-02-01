import { useMemo } from 'react';
import { Obligation, ObligationStatus, RiskLevel } from '@/types/obligation';
import { ObligationCard } from './ObligationCard';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';

interface GroupedTimelineProps {
  obligations: Obligation[];
  onStatusChange: (id: string, status: ObligationStatus) => void;
  className?: string;
}

const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

function isWithinDays(date: Date | null, days: number): boolean {
  if (!date) return false;
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

function isMoreThanDays(date: Date | null, days: number): boolean {
  if (!date) return false;
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

interface ObligationGroup {
  id: 'urgent' | 'upcoming' | 'no-due-date';
  title: string;
  icon: React.ReactNode;
  obligations: Obligation[];
  emptyMessage: string;
}

export function GroupedTimeline({ obligations, onStatusChange, className }: GroupedTimelineProps) {
  const groups = useMemo<ObligationGroup[]>(() => {
    // Filter out completed obligations for grouping
    const active = obligations.filter(ob => ob.status !== 'completed');

    // Urgent: high risk OR due within 7 days
    const urgent = active.filter(
      ob => ob.riskLevel === 'high' || isWithinDays(ob.deadline, 7)
    );

    // Upcoming: due date > 7 days (and not already in urgent)
    const urgentIds = new Set(urgent.map(ob => ob.id));
    const upcoming = active.filter(
      ob => !urgentIds.has(ob.id) && isMoreThanDays(ob.deadline, 7)
    );

    // No due date: null deadline (and not in urgent due to high risk)
    const upcomingIds = new Set(upcoming.map(ob => ob.id));
    const noDueDate = active.filter(
      ob => !urgentIds.has(ob.id) && !upcomingIds.has(ob.id) && !ob.deadline
    );

    // Sort urgent: highest risk, then soonest due date
    urgent.sort((a, b) => {
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Sort upcoming: soonest due date
    upcoming.sort((a, b) => {
      if (!a.deadline || !b.deadline) return 0;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Sort no due date: high → medium → low
    noDueDate.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    return [
      {
        id: 'urgent',
        title: 'Urgent',
        icon: <AlertTriangle className="w-4 h-4" />,
        obligations: urgent,
        emptyMessage: 'No urgent items',
      },
      {
        id: 'upcoming',
        title: 'Upcoming',
        icon: <Calendar className="w-4 h-4" />,
        obligations: upcoming,
        emptyMessage: 'No upcoming deadlines',
      },
      {
        id: 'no-due-date',
        title: 'No due date',
        icon: <Clock className="w-4 h-4" />,
        obligations: noDueDate,
        emptyMessage: 'No items without dates',
      },
    ];
  }, [obligations]);

  const totalActive = groups.reduce((sum, g) => sum + g.obligations.length, 0);

  if (totalActive === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Life Timeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your responsibility dashboard</p>
        </div>
        <EmptyState
          title="Nothing urgent right now."
          description="Upload a document and I'll extract any actions."
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Life Timeline</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalActive} active {totalActive === 1 ? 'obligation' : 'obligations'}
        </p>
      </div>

      {groups.map(group => {
        if (group.obligations.length === 0) return null;

        return (
          <div key={group.id} className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {group.icon}
              <span>
                {group.title} ({group.obligations.length})
              </span>
            </div>

            <div className="space-y-3">
              {group.obligations.map((obligation, index) => (
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
          </div>
        );
      })}
    </div>
  );
}
