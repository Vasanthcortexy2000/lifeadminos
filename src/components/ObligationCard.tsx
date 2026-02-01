import { Obligation } from '@/types/obligation';
import { RiskBadge } from './RiskBadge';
import { StatusIndicator } from './StatusIndicator';
import { format, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileText, Clock, AlertCircle } from 'lucide-react';

interface ObligationCardProps {
  obligation: Obligation;
  onStatusChange?: (id: string, status: Obligation['status']) => void;
  className?: string;
}

export function ObligationCard({ obligation, onStatusChange, className }: ObligationCardProps) {
  const daysUntil = differenceInDays(obligation.deadline, new Date());
  const isOverdue = isPast(obligation.deadline) && obligation.status !== 'completed';
  const isUrgent = daysUntil <= 7 && daysUntil >= 0 && obligation.status !== 'completed';

  const getTimeLabel = () => {
    if (obligation.status === 'completed') return 'Completed';
    if (isOverdue) return 'Overdue';
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    if (daysUntil < 7) return `${daysUntil} days left`;
    return format(obligation.deadline, 'MMM d, yyyy');
  };

  const handleStatusCycle = () => {
    if (!onStatusChange) return;
    const statusOrder: Obligation['status'][] = ['not-started', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(obligation.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    onStatusChange(obligation.id, nextStatus);
  };

  return (
    <div
      className={cn(
        'card-calm p-5 transition-all duration-300 hover:shadow-elevated',
        isOverdue && 'border-risk-high/30 bg-risk-high-bg/30',
        isUrgent && !isOverdue && 'border-risk-medium/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <RiskBadge level={obligation.riskLevel} />
            {obligation.type === 'mandatory' && (
              <span className="text-xs text-muted-foreground">Required</span>
            )}
          </div>

          <h3 className="text-lg font-semibold mb-1 text-foreground">
            {obligation.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {obligation.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{obligation.sourceDocument}</span>
            </div>

            <div
              className={cn(
                'flex items-center gap-1.5',
                isOverdue && 'text-risk-high font-medium',
                isUrgent && !isOverdue && 'text-risk-medium font-medium',
                !isOverdue && !isUrgent && 'text-muted-foreground'
              )}
            >
              {isOverdue ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              <span>{getTimeLabel()}</span>
            </div>
          </div>

          {obligation.consequence && obligation.status !== 'completed' && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">If missed:</span> {obligation.consequence}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleStatusCycle}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
          title="Click to change status"
        >
          <StatusIndicator status={obligation.status} />
        </button>
      </div>
    </div>
  );
}
