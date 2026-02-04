import { PriorityLevel } from '@/types/obligation';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  level: PriorityLevel;
  className?: string;
  calm?: boolean; // Use calmer language when true
}

const priorityConfig = {
  low: {
    label: 'Low Priority',
    calmLabel: 'Informational',
    className: 'priority-badge-low',
  },
  medium: {
    label: 'Medium Priority',
    calmLabel: 'Important',
    className: 'priority-badge-medium',
  },
  high: {
    label: 'High Priority',
    calmLabel: 'Needs attention',
    className: 'priority-badge-high',
  },
};

export function PriorityBadge({ level, className, calm = false }: PriorityBadgeProps) {
  const config = priorityConfig[level];
  const label = calm ? config.calmLabel : config.label;

  return (
    <span className={cn(config.className, className)}>
      {label}
    </span>
  );
}

// Keep RiskBadge as an alias for backwards compatibility
export { PriorityBadge as RiskBadge };

