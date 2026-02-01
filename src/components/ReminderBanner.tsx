import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus, getDaysUntilDue } from '@/lib/dateUtils';

interface ReminderBannerProps {
  obligations: Obligation[];
  onScrollToTimeline?: () => void;
  className?: string;
}

export function ReminderBanner({ obligations, onScrollToTimeline, className }: ReminderBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal when obligations change significantly
  useEffect(() => {
    setIsDismissed(false);
  }, [obligations.length]);

  // Get active reminders: items that need attention (overdue or due soon, not completed)
  const activeItems = obligations.filter(ob => {
    if (ob.status === 'completed') return false;
    const status = getDueDateStatus(ob.deadline);
    return status === 'overdue' || status === 'due-soon';
  });

  // Sort by urgency (overdue first, then by days until due)
  const sortedItems = [...activeItems].sort((a, b) => {
    const daysA = getDaysUntilDue(a.deadline) ?? 999;
    const daysB = getDaysUntilDue(b.deadline) ?? 999;
    return daysA - daysB;
  });

  if (isDismissed || sortedItems.length === 0) {
    return null;
  }

  const overdueCount = sortedItems.filter(ob => getDueDateStatus(ob.deadline) === 'overdue').length;
  const dueSoonCount = sortedItems.length - overdueCount;

  // Generate calm message
  let message = '';
  if (overdueCount > 0 && dueSoonCount > 0) {
    message = `You have ${overdueCount} item${overdueCount !== 1 ? 's' : ''} that may need attention and ${dueSoonCount} coming up soon`;
  } else if (overdueCount > 0) {
    message = `You have ${overdueCount} item${overdueCount !== 1 ? 's' : ''} that may need attention when you're ready`;
  } else {
    message = `You have ${dueSoonCount} item${dueSoonCount !== 1 ? 's' : ''} coming up soon`;
  }

  const handleClick = () => {
    if (onScrollToTimeline) {
      onScrollToTimeline();
    } else {
      // Fallback: scroll to timeline section
      const timelineSection = document.querySelector('[data-section="timeline"]');
      if (timelineSection) {
        timelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 p-4 rounded-xl',
        'bg-secondary/80 border border-border/50',
        'animate-fade-in cursor-pointer hover:bg-secondary transition-colors',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <Bell className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {message}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tap to see details
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
        }}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-accent transition-colors"
        aria-label="Dismiss reminder"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
