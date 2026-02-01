import { NudgeMessage } from '@/types/obligation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface NudgeCardProps {
  nudge: NudgeMessage;
  onDismiss?: (id: string) => void;
  className?: string;
}

const toneStyles = {
  gentle: 'border-l-[hsl(var(--status-completed))] bg-[hsl(var(--risk-low-bg))]/50',
  firm: 'border-l-[hsl(var(--status-in-progress))] bg-secondary',
  urgent: 'border-l-[hsl(var(--risk-high))] bg-[hsl(var(--risk-high-bg))]/50',
};

export function NudgeCard({ nudge, onDismiss, className }: NudgeCardProps) {
  return (
    <div
      className={cn(
        'p-4 border-l-4 rounded-r-lg transition-all duration-300',
        toneStyles[nudge.tone],
        nudge.read && 'opacity-60',
        className
      )}
    >
      <p className="text-sm text-foreground leading-relaxed mb-2">
        {nudge.message}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {format(nudge.createdAt, 'MMM d, h:mm a')}
        </span>
        {onDismiss && !nudge.read && (
          <button
            onClick={() => onDismiss(nudge.id)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}
