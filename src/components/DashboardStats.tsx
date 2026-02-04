import { useMemo } from 'react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus } from '@/lib/dateUtils';
import { CheckCircle2, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  obligations: Obligation[];
  className?: string;
}

export function DashboardStats({ obligations, className = '' }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const needsAttention = obligations.filter(
      (ob) => ob.status !== 'completed' && getDueDateStatus(ob.deadline) === 'overdue'
    ).length;

    const comingUp = obligations.filter(
      (ob) => ob.status !== 'completed' && getDueDateStatus(ob.deadline) === 'due-soon'
    ).length;

    const completedThisWeek = obligations.filter(
      (ob) =>
        ob.status === 'completed' &&
        ob.updatedAt &&
        new Date(ob.updatedAt) >= weekAgo
    ).length;

    return { needsAttention, comingUp, completedThisWeek };
  }, [obligations]);

  const statItems = [
    {
      label: 'Needs attention',
      value: stats.needsAttention,
      icon: Star,
      bgClass: 'bg-[hsl(var(--priority-high-bg))]',
      iconClass: 'text-[hsl(var(--priority-high))]',
    },
    {
      label: 'Coming up',
      value: stats.comingUp,
      icon: Clock,
      bgClass: 'bg-[hsl(var(--priority-medium-bg))]',
      iconClass: 'text-[hsl(var(--priority-medium))]',
    },
    {
      label: 'Done this week',
      value: stats.completedThisWeek,
      icon: CheckCircle2,
      bgClass: 'bg-[hsl(var(--priority-low-bg))]',
      iconClass: 'text-[hsl(var(--status-completed))]',
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 rounded-xl border border-border bg-card/50 p-3 sm:p-4',
        className
      )}
      role="region"
      aria-label="Dashboard statistics"
    >
      {statItems.map((stat) => (
        <div 
          key={stat.label}
          className="flex items-center gap-3 p-2 sm:p-0"
          role="group"
          aria-label={`${stat.label}: ${stat.value}`}
        >
          <div 
            className={cn(
              'flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg',
              stat.bgClass
            )}
            aria-hidden="true"
          >
            <stat.icon className={cn('h-5 w-5 sm:h-4 sm:w-4', stat.iconClass)} />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-lg font-semibold tabular-nums text-foreground">
              {stat.value}
            </p>
            <p className="text-sm sm:text-xs text-muted-foreground truncate">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
