import { useMemo } from 'react';
import { Obligation } from '@/types/obligation';
import { getDueDateStatus, getDaysUntilDue } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Sparkles, CheckCircle2, Clock } from 'lucide-react';

interface WeeklySummaryProps {
  obligations: Obligation[];
  className?: string;
}

export function WeeklySummary({ obligations, className }: WeeklySummaryProps) {
  const summary = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get active (non-completed) obligations
    const active = obligations.filter(ob => ob.status !== 'completed');
    const completed = obligations.filter(ob => ob.status === 'completed');
    
    // Focus items: high risk OR due within 7 days (overdue or due-soon)
    const focus = active.filter(ob => {
      const status = getDueDateStatus(ob.deadline);
      return ob.riskLevel === 'high' || status === 'overdue' || status === 'due-soon';
    }).sort((a, b) => {
      // Sort by: overdue first, then by risk, then by due date
      const statusA = getDueDateStatus(a.deadline);
      const statusB = getDueDateStatus(b.deadline);
      
      if (statusA === 'overdue' && statusB !== 'overdue') return -1;
      if (statusB === 'overdue' && statusA !== 'overdue') return 1;
      
      const riskOrder = { high: 0, medium: 1, low: 2 };
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      
      const daysA = getDaysUntilDue(a.deadline) ?? 999;
      const daysB = getDaysUntilDue(b.deadline) ?? 999;
      return daysA - daysB;
    }).slice(0, 3);
    
    // Items that can wait: due later than 7 days
    const canWait = active.filter(ob => {
      const days = getDaysUntilDue(ob.deadline);
      return days !== null && days > 7;
    });
    
    // Recently completed (within the last week)
    const recentlyCompleted = completed.filter(ob => {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return ob.updatedAt >= weekAgo;
    });
    
    return { focus, canWait, recentlyCompleted };
  }, [obligations]);
  
  if (summary.focus.length === 0 && summary.recentlyCompleted.length === 0) {
    return null;
  }
  
  return (
    <section 
      className={cn('card-calm p-4 sm:p-6', className)}
      aria-labelledby="weekly-summary-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
        <h3 id="weekly-summary-heading" className="text-sm font-medium text-foreground">This week</h3>
      </div>
      
      {summary.focus.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-3">
            Focus on {summary.focus.length === 1 ? 'this' : `these ${summary.focus.length} things`}:
          </p>
          <ol className="space-y-2" role="list" aria-label="Priority items for this week">
            {summary.focus.map((ob, index) => (
              <li 
                key={ob.id}
                className="flex items-start gap-2 text-sm"
              >
                <span 
                  className={cn(
                    'flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-xs font-medium',
                    getDueDateStatus(ob.deadline) === 'overdue' 
                      ? 'bg-[hsl(var(--risk-high-bg))] text-[hsl(var(--risk-high))]'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="text-foreground line-clamp-2">{ob.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      
      {summary.canWait.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Clock className="w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{summary.canWait.length} item{summary.canWait.length !== 1 ? 's' : ''} can wait</span>
        </div>
      )}
      
      {summary.recentlyCompleted.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[hsl(var(--status-completed))] flex-shrink-0" aria-hidden="true" />
          <span>{summary.recentlyCompleted.length} completed this week</span>
        </div>
      )}
    </section>
  );
}
