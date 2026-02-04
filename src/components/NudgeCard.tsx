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
    <article
      className={cn(
        'p-3 sm:p-4 border-l-4 rounded-r-lg transition-all duration-300',
        toneStyles[nudge.tone],
        nudge.read && 'opacity-60',
        className
      )}
      aria-label={`Notification: ${nudge.message.substring(0, 50)}...`}
    >
      <p className="text-sm text-foreground leading-relaxed mb-2">
        {nudge.message}
      </p>
      <div className="flex items-center justify-between gap-2">
        <time 
          dateTime={nudge.createdAt.toISOString()} 
          className="text-xs text-muted-foreground"
        >
          {format(nudge.createdAt, 'MMM d, h:mm a')}
        </time>
        {onDismiss && !nudge.read && (
          <button
            onClick={() => onDismiss(nudge.id)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 py-2 sm:py-0 px-2 -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            aria-label="Mark this notification as read"
          >
            Mark as read
          </button>
        )}
      </div>
    </article>
  );
}
