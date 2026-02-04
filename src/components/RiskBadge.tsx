import { PriorityLevel } from '@/types/obligation';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: PriorityLevel;
  className?: string;
}

const riskConfig = {
  low: {
    label: 'Low Priority',
    className: 'risk-badge-low',
  },
  medium: {
    label: 'Medium Priority',
    className: 'risk-badge-medium',
  },
  high: {
    label: 'High Priority',
    className: 'risk-badge-high',
  },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  );
}
