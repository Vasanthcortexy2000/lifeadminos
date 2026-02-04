import { useMemo } from 'react';
import { Obligation, ObligationStatus, ObligationUpdate, PriorityLevel } from '@/types/obligation';
import { ObligationCard } from './ObligationCard';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import { getDueDateStatus, getDaysUntilDue } from '@/lib/dateUtils';
import { Clock, Calendar, CheckCircle2, Star } from 'lucide-react';

interface GroupedTimelineProps {
  obligations: Obligation[];
  onStatusChange: (id: string, status: ObligationStatus) => Promise<void> | void;
  onUpdate: (id: string, updates: ObligationUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

const priorityOrder: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };

interface ObligationGroup {
  id: 'needs-attention' | 'upcoming' | 'no-due-date' | 'completed';
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

    // Needs attention: high priority OR overdue OR due within 7 days
    const needsAttention = active.filter(ob => {
      const status = getDueDateStatus(ob.deadline);
      return ob.riskLevel === 'high' || status === 'overdue' || status === 'due-soon';
    });

    // Upcoming: due date > 7 days (and not already in needs attention)
    const needsAttentionIds = new Set(needsAttention.map(ob => ob.id));
    const upcoming = active.filter(ob => {
      const status = getDueDateStatus(ob.deadline);
      return !needsAttentionIds.has(ob.id) && status === 'upcoming';
    });

    // No due date: null deadline (and not in needs attention due to high priority)
    const upcomingIds = new Set(upcoming.map(ob => ob.id));
    const noDueDate = active.filter(
      ob => !needsAttentionIds.has(ob.id) && !upcomingIds.has(ob.id) && !ob.deadline
    );

    // Sort needs attention: overdue first, then highest priority, then soonest due date
    needsAttention.sort((a, b) => {
      const statusA = getDueDateStatus(a.deadline);
      const statusB = getDueDateStatus(b.deadline);
      
      // Overdue first
      if (statusA === 'overdue' && statusB !== 'overdue') return -1;
      if (statusB === 'overdue' && statusA !== 'overdue') return 1;
      
      // Then by priority
      const priorityDiff = priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel];
      if (priorityDiff !== 0) return priorityDiff;
      
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
    noDueDate.sort((a, b) => priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel]);

    // Sort completed: most recently updated first
    completed.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return [
      {
        id: 'needs-attention',
        title: 'Needs Attention',
        icon: <Star className="w-4 h-4" />,
        obligations: needsAttention,
        emptyMessage: 'Nothing needs immediate attention',
      },
      {
        id: 'upcoming',
        title: 'Coming Up',
        icon: <Calendar className="w-4 h-4" />,
        obligations: upcoming,
        emptyMessage: 'No upcoming deadlines',
      },
      {
        id: 'no-due-date',
        title: 'When You Have Time',
        icon: <Clock className="w-4 h-4" />,
        obligations: noDueDate,
        emptyMessage: 'No flexible items',
      },
      {
        id: 'completed',
        title: 'Completed',
        icon: <CheckCircle2 className="w-4 h-4" />,
        obligations: completed.slice(0, 5), // Show only recent 5
        emptyMessage: 'No completed items yet',
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
          description="Upload a document and I'll extract any responsibilities. I'll keep track so you don't have to."
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

        const isCompleted = group.id === 'completed';

        return (
          <div key={group.id} className="space-y-4 relative">
            {/* Timeline line */}
            <div className="timeline-line" />
            
            <div className={cn(
              'flex items-center gap-3 text-sm font-medium relative',
              group.id === 'needs-attention' ? 'text-[hsl(var(--priority-high))]' : 'text-muted-foreground'
            )}>
              {/* Timeline dot for section */}
              <div className={cn(
                'timeline-dot',
                group.id === 'needs-attention' && 'timeline-dot-high',
                group.id === 'upcoming' && 'timeline-dot-medium',
                group.id === 'no-due-date' && 'timeline-dot-low',
                isCompleted && 'timeline-dot-completed'
              )} />
              {group.icon}
              <span>
                {group.title} ({group.obligations.length})
              </span>
            </div>

            <div className={cn(
              'space-y-3 ml-7',
              isCompleted && 'obligation-completed'
            )}>
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
