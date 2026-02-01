import { RiskLevel } from '@/types/obligation';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const riskConfig = {
  low: {
    label: 'Low Risk',
    className: 'risk-badge-low',
  },
  medium: {
    label: 'Medium Risk',
    className: 'risk-badge-medium',
  },
  high: {
    label: 'High Risk',
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
