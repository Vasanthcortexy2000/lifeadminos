import { cn } from '@/lib/utils';
import { getDueDateStatus, formatDueStatus, DueDateStatus } from '@/lib/dateUtils';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';

interface DueDateBadgeProps {
  deadline: Date | null;
  className?: string;
}

const statusConfig: Record<DueDateStatus, {
  icon: typeof Calendar;
  className: string;
  bgClassName: string;
}> = {
  overdue: {
    icon: AlertTriangle,
    className: 'text-[hsl(var(--risk-high))]',
    bgClassName: 'bg-[hsl(var(--risk-high-bg))]',
  },
  'due-soon': {
    icon: Clock,
    className: 'text-[hsl(var(--risk-medium))]',
    bgClassName: 'bg-[hsl(var(--risk-medium-bg))]',
  },
  upcoming: {
    icon: Calendar,
    className: 'text-muted-foreground',
    bgClassName: 'bg-secondary',
  },
  'no-date': {
    icon: Calendar,
    className: 'text-muted-foreground',
    bgClassName: 'bg-secondary',
  },
};

export function DueDateBadge({ deadline, className }: DueDateBadgeProps) {
  const status = getDueDateStatus(deadline);
  const { icon: Icon, className: textClass, bgClassName } = statusConfig[status];
  const label = formatDueStatus(deadline);
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      bgClassName,
      textClass,
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}
