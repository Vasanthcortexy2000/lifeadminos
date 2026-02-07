import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar, CheckCircle2, AlertCircle, 
  Clock, Loader2, RefreshCw, TrendingUp 
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DigestObligation {
  id: string;
  title: string;
  deadline: string | null;
  risk_level: string;
  domain: string | null;
}

interface DigestData {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  stats: {
    totalActive: number;
    overdueCount: number;
    dueThisWeekCount: number;
    dueNextWeekCount: number;
    completedThisWeekCount: number;
    highPriorityCount: number;
  };
  sections: {
    overdue: DigestObligation[];
    dueThisWeek: DigestObligation[];
    dueNextWeek: DigestObligation[];
    completedThisWeek: DigestObligation[];
    upcoming: DigestObligation[];
  };
  message: string;
}

export default function WeeklyDigest() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchDigest = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('weekly-digest');
      
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      
      setDigest(data);
    } catch (err) {
      console.error('Error fetching digest:', err);
      setError('Failed to load weekly digest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, [user]);

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'No deadline';
    return format(new Date(deadline), 'EEE, MMM d');
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-[hsl(var(--risk-high))]';
      case 'medium': return 'text-[hsl(var(--risk-medium))]';
      default: return 'text-[hsl(var(--risk-low))]';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Weekly Digest</h1>
              <p className="text-sm text-muted-foreground">
                Your week at a glance
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDigest}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDigest}>Try Again</Button>
            </div>
          </Card>
        ) : digest ? (
          <div className="space-y-6">
            {/* Summary message */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-lg font-medium text-foreground">{digest.message}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Week of {format(new Date(digest.weekStart), 'MMM d')} -{' '}
                  {format(new Date(digest.weekEnd), 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {digest.stats.totalActive}
                  </div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </CardContent>
              </Card>
              <Card className={digest.stats.overdueCount > 0 ? 'border-[hsl(var(--risk-high))]/50' : ''}>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className={cn(
                    "text-2xl font-bold",
                    digest.stats.overdueCount > 0 ? 'text-[hsl(var(--risk-high))]' : 'text-foreground'
                  )}>
                    {digest.stats.overdueCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {digest.stats.dueThisWeekCount}
                  </div>
                  <div className="text-xs text-muted-foreground">This Week</div>
                </CardContent>
              </Card>
              <Card className="border-[hsl(var(--risk-low))]/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-[hsl(var(--risk-low))]">
                    {digest.stats.completedThisWeekCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
            </div>

            {/* Overdue section */}
            {digest.sections.overdue.length > 0 && (
              <Card className="border-[hsl(var(--risk-high))]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--risk-high))]">
                    <AlertCircle className="w-4 h-4" />
                    Needs Attention ({digest.sections.overdue.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {digest.sections.overdue.map((ob) => (
                    <div key={ob.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ob.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDeadline(ob.deadline)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Due this week */}
            {digest.sections.dueThisWeek.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[hsl(var(--risk-medium))]" />
                    Due This Week ({digest.sections.dueThisWeek.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {digest.sections.dueThisWeek.map((ob) => (
                    <div key={ob.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", getPriorityColor(ob.risk_level).replace('text-', 'bg-'))} />
                        <span className="text-sm">{ob.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDeadline(ob.deadline)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Due next week */}
            {digest.sections.dueNextWeek.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Coming Up Next Week ({digest.sections.dueNextWeek.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {digest.sections.dueNextWeek.map((ob) => (
                    <div key={ob.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", getPriorityColor(ob.risk_level).replace('text-', 'bg-'))} />
                        <span className="text-sm">{ob.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDeadline(ob.deadline)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Completed this week */}
            {digest.sections.completedThisWeek.length > 0 && (
              <Card className="bg-[hsl(var(--risk-low))]/5 border-[hsl(var(--risk-low))]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--risk-low))]">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed This Week ({digest.sections.completedThisWeek.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {digest.sections.completedThisWeek.map((ob) => (
                    <div key={ob.id} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--risk-low))]" />
                      <span className="text-sm text-muted-foreground line-through">{ob.title}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* All caught up message */}
            {digest.stats.overdueCount === 0 && 
             digest.stats.dueThisWeekCount === 0 && 
             digest.stats.dueNextWeekCount === 0 && (
              <Card className="p-8">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-[hsl(var(--risk-low))] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    You're all caught up!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    No immediate deadlines. Enjoy the breathing room.
                  </p>
                </div>
              </Card>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
