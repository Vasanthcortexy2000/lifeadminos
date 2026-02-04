import { CheckCircle2, ArrowRight, Heart } from 'lucide-react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus, formatDueStatus } from '@/lib/dateUtils';
import { useStressAwareness } from '@/hooks/useStressAwareness';
import { cn } from '@/lib/utils';

interface TodayFocusProps {
  obligations: Obligation[];
  className?: string;
}

export function TodayFocus({ obligations, className }: TodayFocusProps) {
  const { isStressed, stressLevel, reassurance } = useStressAwareness(obligations);
  
  // Filter to get high-priority items: high priority OR due today/soon, not completed
  const focusItems = obligations
    .filter(ob => {
      if (ob.status === 'completed') return false;
      const dueDateStatus = getDueDateStatus(ob.deadline);
      const isUrgent = dueDateStatus === 'overdue' || dueDateStatus === 'due-soon';
      const isHighPriority = ob.riskLevel === 'high';
      return isUrgent || isHighPriority;
    })
    .sort((a, b) => {
      // Sort by: overdue first, then by priority level, then by due date
      const statusA = getDueDateStatus(a.deadline);
      const statusB = getDueDateStatus(b.deadline);
      
      // Overdue items first
      if (statusA === 'overdue' && statusB !== 'overdue') return -1;
      if (statusB === 'overdue' && statusA !== 'overdue') return 1;
      
      // Then high priority
      if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
      if (b.riskLevel === 'high' && a.riskLevel !== 'high') return 1;
      
      // Then by due date
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    })
    .slice(0, isStressed ? 2 : 3); // Show fewer items when stressed

  // Don't show if nothing to focus on
  if (focusItems.length === 0) {
    return (
      <div className={cn('p-5 bg-card rounded-xl border border-border/50', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-primary" />
          <h3 className="text-base font-medium text-foreground">
            You're all caught up
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nothing needs your attention right now. Take a moment for yourself.
        </p>
      </div>
    );
  }

  const getMessage = () => {
    if (isStressed && stressLevel === 'elevated') {
      return focusItems.length === 1 
        ? "Let's focus on just this one thing today:"
        : "Here's what matters most right now:";
    }
    if (focusItems.length === 1) {
      return "Today, focus on this:";
    }
    return `Today, focus on these ${focusItems.length} things:`;
  };

  const getReassuranceMessage = () => {
    if (stressLevel === 'elevated') {
      return reassurance;
    }
    if (stressLevel === 'moderate') {
      return "You're doing great. Take it one step at a time.";
    }
    return "Take it one step at a time. You've got this.";
  };

  const getPriorityLabel = (level: string, deadline: Date | null) => {
    const dueDateStatus = getDueDateStatus(deadline);
    
    if (dueDateStatus === 'overdue') {
      return isStressed ? 'Past due date' : 'Overdue';
    }
    
    if (level === 'high') {
      return isStressed ? 'Needs attention' : 'High priority';
    }
    
    return formatDueStatus(deadline);
  };

  return (
    <div className={cn('p-5 bg-card rounded-xl border border-border/50', className)}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <h3 className="text-base font-medium text-foreground">
          {getMessage()}
        </h3>
      </div>

      <div className="space-y-3">
        {focusItems.map((item, index) => (
          <div 
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getPriorityLabel(item.riskLevel, item.deadline)}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {getReassuranceMessage()}
      </p>
    </div>
  );
}
