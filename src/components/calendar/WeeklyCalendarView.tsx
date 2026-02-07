import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDueDateStatus } from '@/lib/dateUtils';
import { DomainBadge } from '@/components/LifeDomain';
import type { Obligation } from '@/types/obligation';

interface WeeklyCalendarViewProps {
  currentDate: Date;
  obligations: Obligation[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  onObligationClick: () => void;
}

export const WeeklyCalendarView = ({
  currentDate,
  obligations,
  selectedDate,
  onSelectDate,
  onObligationClick,
}: WeeklyCalendarViewProps) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const obligationsByDate = useMemo(() => {
    const map = new Map<string, Obligation[]>();
    obligations.forEach((ob) => {
      if (ob.deadline) {
        const dateKey = format(new Date(ob.deadline), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(ob);
      }
    });
    return map;
  }, [obligations]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--priority-low))]" aria-hidden="true" />;
      case 'in-progress':
        return <Clock className="w-3.5 h-3.5 text-[hsl(var(--priority-medium))]" aria-hidden="true" />;
      default:
        return <Star className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const getPriorityColor = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'high':
        return 'bg-[hsl(var(--priority-high-bg))] text-[hsl(var(--priority-high))] border-[hsl(var(--priority-high)/0.3)]';
      case 'medium':
        return 'bg-[hsl(var(--priority-medium-bg))] text-[hsl(var(--priority-medium))] border-[hsl(var(--priority-medium)/0.3)]';
      default:
        return 'bg-[hsl(var(--priority-low-bg))] text-[hsl(var(--priority-low))] border-[hsl(var(--priority-low)/0.3)]';
    }
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="space-y-4" role="grid" aria-label="Weekly calendar view">
      {/* Week header */}
      <div 
        className="grid grid-cols-7 gap-2" 
        role="row"
        aria-label="Days of the week"
      >
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            role="columnheader"
            className={cn(
              "text-center p-2 rounded-lg transition-colors cursor-pointer min-h-[44px] flex flex-col items-center justify-center",
              isToday(day) && "bg-primary text-primary-foreground",
              selectedDate && isSameDay(day, selectedDate) && !isToday(day) && "bg-accent",
              !isToday(day) && !isSameDay(day, selectedDate || new Date()) && "hover:bg-accent/50"
            )}
            onClick={() => onSelectDate(day)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectDate(day)}
            tabIndex={0}
            aria-selected={selectedDate ? isSameDay(day, selectedDate) : false}
            aria-current={isToday(day) ? 'date' : undefined}
          >
            <span className="text-xs font-medium uppercase tracking-wide">
              {format(day, 'EEE')}
            </span>
            <span className={cn(
              "text-lg font-semibold",
              isToday(day) ? "text-primary-foreground" : "text-foreground"
            )}>
              {format(day, 'd')}
            </span>
          </div>
        ))}
      </div>

      {/* Week content */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3"
        role="row"
      >
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayObligations = obligationsByDate.get(dateKey) || [];
          
          return (
            <Card
              key={day.toISOString()}
              role="gridcell"
              className={cn(
                "min-h-[120px] transition-all",
                isToday(day) && "ring-2 ring-primary ring-offset-2",
                selectedDate && isSameDay(day, selectedDate) && "bg-accent/30"
              )}
              aria-label={`${format(day, 'EEEE, MMMM d')}, ${dayObligations.length} obligations`}
            >
              <CardContent className="p-3">
                {/* Mobile: Show day header inside card */}
                <div className="lg:hidden mb-2 pb-2 border-b">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'EEEE, MMM d')}
                  </span>
                </div>

                {dayObligations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No tasks
                  </p>
                ) : (
                  <ul className="space-y-2" aria-label={`Obligations for ${format(day, 'MMMM d')}`}>
                    {dayObligations.slice(0, 3).map((ob) => {
                      const dueDateStatus = getDueDateStatus(ob.deadline);
                      return (
                        <li
                          key={ob.id}
                          className={cn(
                            "p-2 rounded-md border text-left cursor-pointer transition-colors hover:bg-accent/50",
                            getPriorityColor(ob.riskLevel),
                            ob.status === 'completed' && "opacity-60"
                          )}
                          onClick={onObligationClick}
                          onKeyDown={(e) => e.key === 'Enter' && onObligationClick()}
                          tabIndex={0}
                          role="button"
                          aria-label={`${ob.title}, ${ob.riskLevel} priority${ob.status === 'completed' ? ', completed' : ''}`}
                        >
                          <div className="flex items-start gap-1.5">
                            {getStatusIcon(ob.status)}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-xs font-medium truncate",
                                ob.status === 'completed' && "line-through"
                              )}>
                                {ob.title}
                              </p>
                              {ob.domain && (
                                <div className="mt-1">
                                  <DomainBadge domain={ob.domain} />
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {dayObligations.length > 3 && (
                      <li className="text-xs text-muted-foreground text-center">
                        +{dayObligations.length - 3} more
                      </li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
