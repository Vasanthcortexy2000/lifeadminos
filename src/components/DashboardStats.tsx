import { useMemo } from 'react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus } from '@/lib/dateUtils';
import { CheckCircle2, Clock, Star } from 'lucide-react';

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

  return (
    <div
      className={`grid grid-cols-3 gap-4 rounded-xl border border-border bg-card/50 p-4 ${className}`}
      role="region"
      aria-label="At a glance"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--priority-high-bg))]">
          <Star className="h-4 w-4 text-[hsl(var(--priority-high))]" />
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{stats.needsAttention}</p>
          <p className="text-xs text-muted-foreground">Needs attention</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--priority-medium-bg))]">
          <Clock className="h-4 w-4 text-[hsl(var(--priority-medium))]" />
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{stats.comingUp}</p>
          <p className="text-xs text-muted-foreground">Coming up</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--priority-low-bg))]">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-completed))]" />
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{stats.completedThisWeek}</p>
          <p className="text-xs text-muted-foreground">Done this week</p>
        </div>
      </div>
    </div>
  );
}
