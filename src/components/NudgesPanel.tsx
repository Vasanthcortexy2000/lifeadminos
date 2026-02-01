import { NudgeMessage } from '@/types/obligation';
import { NudgeCard } from './NudgeCard';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NudgesPanelProps {
  nudges: NudgeMessage[];
  onDismiss: (id: string) => void;
  className?: string;
}

export function NudgesPanel({ nudges, onDismiss, className }: NudgesPanelProps) {
  const unreadCount = nudges.filter(n => !n.read).length;

  // Show a calm message when there are no nudges
  if (nudges.length === 0) {
    return (
      <div className={cn('card-calm p-5', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Updates</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nothing urgent right now. I'll let you know when something needs attention.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('card-calm p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          Updates
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {unreadCount} new
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-3">
        {nudges.map((nudge, index) => (
          <div
            key={nudge.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <NudgeCard
              nudge={nudge}
              onDismiss={onDismiss}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
