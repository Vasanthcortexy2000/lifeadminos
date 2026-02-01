import { useMemo } from 'react';
import { Obligation, ObligationStatus, ObligationUpdate, RiskLevel } from '@/types/obligation';
import { ObligationCard } from './ObligationCard';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import { getDueDateStatus, getDaysUntilDue } from '@/lib/dateUtils';
import { AlertTriangle, Calendar, Clock, CheckCircle2 } from 'lucide-react';

interface GroupedTimelineProps {
  obligations: Obligation[];
  onStatusChange: (id: string, status: ObligationStatus) => Promise<void> | void;
  onUpdate: (id: string, updates: ObligationUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

interface ObligationGroup {
  id: 'urgent' | 'upcoming' | 'no-due-date' | 'completed';
  title: string;
  icon: React.ReactNode;
  obligations: Obligation[];
  emptyMessage: string;
}

export function GroupedTimeline({ 
  obligations, 
  onStatusChange, 
  onUpdate,
  onDelete, 
  className 
}: GroupedTimelineProps) {
  const groups = useMemo<ObligationGroup[]>(() => {
    // Separate active and completed
    const active = obligations.filter(ob => ob.status !== 'completed');
    const completed = obligations.filter(ob => ob.status === 'completed');

    // Urgent: high risk OR overdue OR due within 7 days
    const urgent = active.filter(ob => {
      const status = getDueDateStatus(ob.deadline);
      return ob.riskLevel === 'high' || status === 'overdue' || status === 'due-soon';
    });

    // Upcoming: due date > 7 days (and not already in urgent)
    const urgentIds = new Set(urgent.map(ob => ob.id));
    const upcoming = active.filter(ob => {
      const status = getDueDateStatus(ob.deadline);
      return !urgentIds.has(ob.id) && status === 'upcoming';
    });

    // No due date: null deadline (and not in urgent due to high risk)
    const upcomingIds = new Set(upcoming.map(ob => ob.id));
    const noDueDate = active.filter(
      ob => !urgentIds.has(ob.id) && !upcomingIds.has(ob.id) && !ob.deadline
    );

    // Sort urgent: overdue first, then highest risk, then soonest due date
    urgent.sort((a, b) => {
      const statusA = getDueDateStatus(a.deadline);
      const statusB = getDueDateStatus(b.deadline);
      
      // Overdue first
      if (statusA === 'overdue' && statusB !== 'overdue') return -1;
      if (statusB === 'overdue' && statusA !== 'overdue') return 1;
      
      // Then by risk
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      
      // Then by due date
      const daysA = getDaysUntilDue(a.deadline) ?? 999;
      const daysB = getDaysUntilDue(b.deadline) ?? 999;
      return daysA - daysB;
    });

    // Sort upcoming: soonest due date
    upcoming.sort((a, b) => {
      const daysA = getDaysUntilDue(a.deadline) ?? 999;
      const daysB = getDaysUntilDue(b.deadline) ?? 999;
      return daysA - daysB;
    });

    // Sort no due date: high → medium → low
    noDueDate.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    // Sort completed: most recently updated first
    completed.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

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
      {
        id: 'completed',
        title: 'Completed',
        icon: <CheckCircle2 className="w-4 h-4" />,
        obligations: completed.slice(0, 5), // Show only recent 5
        emptyMessage: 'No completed items',
      },
    ];
  }, [obligations]);

  const totalActive = groups
    .filter(g => g.id !== 'completed')
    .reduce((sum, g) => sum + g.obligations.length, 0);

  if (obligations.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Life Timeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your responsibility dashboard</p>
        </div>
        <EmptyState
          title="Nothing here yet."
          description="Upload a document and I'll extract any responsibilities."
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Life Timeline</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalActive} active {totalActive === 1 ? 'responsibility' : 'responsibilities'}
        </p>
      </div>

      {groups.map(group => {
        if (group.obligations.length === 0) return null;

        return (
          <div key={group.id} className="space-y-4">
            <div className={cn(
              'flex items-center gap-2 text-sm font-medium',
              group.id === 'urgent' ? 'text-[hsl(var(--risk-high))]' : 'text-muted-foreground'
            )}>
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
                    onUpdate={onUpdate}
                    onDelete={onDelete}
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
