import { ObligationStatus } from '@/types/obligation';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: ObligationStatus;
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  'not-started': {
    label: 'Not started',
    dotClass: 'status-not-started',
  },
  'in-progress': {
    label: 'In progress',
    dotClass: 'status-in-progress',
  },
  'completed': {
    label: 'Completed',
    dotClass: 'status-completed',
  },
};

export function StatusIndicator({ status, showLabel = true, className }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('status-indicator', config.dotClass)} />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
