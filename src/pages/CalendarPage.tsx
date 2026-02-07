import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useObligations } from '@/hooks/useObligations';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, Star, CalendarDays, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDueDateStatus } from '@/lib/dateUtils';
import { DomainBadge } from '@/components/LifeDomain';
import { WeeklyCalendarView } from '@/components/calendar/WeeklyCalendarView';
import type { Obligation } from '@/types/obligation';

const CalendarPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { obligations, loading: obligationsLoading } = useObligations();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Group obligations by date
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

  // Get obligations for selected date
  const selectedDateObligations = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return obligationsByDate.get(dateKey) || [];
  }, [selectedDate, obligationsByDate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-[hsl(var(--priority-low))]" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-[hsl(var(--priority-medium))]" />;
      default:
        return <Star className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'High priority';
      case 'medium':
        return 'Medium priority';
      default:
        return 'Low priority';
    }
  };

  const getPriorityColor = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'high':
        return 'bg-[hsl(var(--priority-high-bg))] text-[hsl(var(--priority-high))]';
      case 'medium':
        return 'bg-[hsl(var(--priority-medium-bg))] text-[hsl(var(--priority-medium))]';
      default:
        return 'bg-[hsl(var(--priority-low-bg))] text-[hsl(var(--priority-low))]';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <CalendarIcon className="w-6 h-6" aria-hidden="true" />
                Your Calendar
              </h2>
              <p className="text-muted-foreground">
                See all your obligations and deadlines at a glance
              </p>
            </div>
            
            {/* View Toggle */}
            <Tabs 
              value={viewMode} 
              onValueChange={(v) => setViewMode(v as 'month' | 'week')}
              className="w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 min-w-[200px]" aria-label="Calendar view mode">
                <TabsTrigger 
                  value="month" 
                  className="flex items-center gap-2 min-h-[44px]"
                  aria-label="Monthly view"
                >
                  <CalendarDays className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Month</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="week" 
                  className="flex items-center gap-2 min-h-[44px]"
                  aria-label="Weekly view"
                >
                  <CalendarRange className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Week</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="animate-slide-up">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">
                    {viewMode === 'month' 
                      ? format(currentMonth, 'MMMM yyyy')
                      : `Week of ${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                    }
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 min-h-[44px] min-w-[44px]"
                      onClick={() => viewMode === 'month' 
                        ? setCurrentMonth(subMonths(currentMonth, 1))
                        : setCurrentMonth(subWeeks(currentMonth, 1))
                      }
                      aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => {
                        setCurrentMonth(new Date());
                        setSelectedDate(new Date());
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 min-h-[44px] min-w-[44px]"
                      onClick={() => viewMode === 'month'
                        ? setCurrentMonth(addMonths(currentMonth, 1))
                        : setCurrentMonth(addWeeks(currentMonth, 1))
                      }
                      aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {obligationsLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : viewMode === 'week' ? (
                  <WeeklyCalendarView
                    currentDate={currentMonth}
                    obligations={obligations}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onObligationClick={() => navigate('/')}
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="rounded-md border-0 pointer-events-auto w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                      month: "space-y-4 w-full",
                      table: "w-full border-collapse",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                      row: "flex w-full mt-2",
                      cell: "flex-1 h-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: cn(
                        "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
                      ),
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-semibold",
                      day_outside: "day-outside text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                    }}
                    components={{
                      DayContent: ({ date }) => {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        const dayObs = obligationsByDate.get(dateKey) || [];
                        const hasHigh = dayObs.some(o => o.riskLevel === 'high' && o.status !== 'completed');
                        const hasMedium = dayObs.some(o => o.riskLevel === 'medium' && o.status !== 'completed');
                        const hasOverdue = dayObs.some(o => getDueDateStatus(o.deadline) === 'overdue' && o.status !== 'completed');
                        
                        return (
                          <div className="flex flex-col items-center">
                            <span>{date.getDate()}</span>
                            {dayObs.length > 0 && (
                              <div className="flex gap-0.5">
                                {hasOverdue ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--priority-high))]" aria-label="Has overdue items" />
                                ) : hasHigh ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--priority-high))]" aria-label="Has high priority items" />
                                ) : hasMedium ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--priority-medium))]" aria-label="Has medium priority items" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--priority-low))]" aria-label="Has low priority items" />
                                )}
                                {dayObs.length > 1 && (
                                  <span className="text-[10px] text-muted-foreground">+{dayObs.length - 1}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      },
                    }}
                  />
                )}
                
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground" role="legend" aria-label="Priority colors legend">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--priority-high))]" aria-hidden="true" />
                    <span>High priority</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--priority-medium))]" aria-hidden="true" />
                    <span>Medium priority</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--priority-low))]" aria-hidden="true" />
                    <span>Low priority</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Details */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateObligations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nothing scheduled for this date
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateObligations.map((ob) => (
                      <div
                        key={ob.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/')}
                      >
                        <div className="flex items-start gap-2">
                          {getStatusIcon(ob.status)}
                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "text-sm font-medium truncate",
                              ob.status === 'completed' && "line-through text-muted-foreground"
                            )}>
                              {ob.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {ob.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={cn("text-xs", getPriorityColor(ob.riskLevel))}>
                                {getPriorityLabel(ob.riskLevel)}
                              </Badge>
                              {ob.domain && <DomainBadge domain={ob.domain} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                {obligationsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-2xl font-semibold text-foreground">
                        {obligations.filter(o => 
                          o.deadline && 
                          isSameMonth(new Date(o.deadline), currentMonth) &&
                          o.status !== 'completed'
                        ).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                      <p className="text-2xl font-semibold text-[hsl(var(--priority-low))]">
                        {obligations.filter(o => 
                          o.deadline && 
                          isSameMonth(new Date(o.deadline), currentMonth) &&
                          o.status === 'completed'
                        ).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50 text-center col-span-2">
                      <p className="text-2xl font-semibold text-[hsl(var(--priority-high))]">
                        {obligations.filter(o => 
                          o.deadline && 
                          getDueDateStatus(o.deadline) === 'overdue' &&
                          o.status !== 'completed'
                        ).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Past due date</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;
