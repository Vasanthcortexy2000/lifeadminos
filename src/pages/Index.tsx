import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DocumentUpload } from '@/components/DocumentUpload';
import { GroupedTimeline } from '@/components/GroupedTimeline';
import { GroupedBySubject } from '@/components/GroupedBySubject';
import { WeeklySummary } from '@/components/WeeklySummary';
import { NudgesPanel } from '@/components/NudgesPanel';
import { UrgentNudgeBanner } from '@/components/UrgentNudgeBanner';
import { ReminderBanner } from '@/components/ReminderBanner';
import { TodayFocus } from '@/components/TodayFocus';
import { ReminderPreferencesDialog } from '@/components/ReminderPreferencesDialog';
import { DomainFilter, LifeDomain } from '@/components/LifeDomain';
import { EmptyState } from '@/components/EmptyState';
import { DashboardStats } from '@/components/DashboardStats';
import { useAuth } from '@/contexts/AuthContext';
import { useObligations } from '@/hooks/useObligations';
import { useNudges } from '@/hooks/useNudges';
import { useStressAwareness } from '@/hooks/useStressAwareness';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, List, Folder } from 'lucide-react';

type ViewMode = 'timeline' | 'subject';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDomains, setSelectedDomains] = useState<LifeDomain[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const { 
    obligations, 
    loading: obligationsLoading, 
    updateStatus, 
    updateObligation,
    deleteObligation, 
    refetch 
  } = useObligations();
  const { nudges, dismissNudge } = useNudges();
  const { isStressed, reassurance } = useStressAwareness(obligations);

  // Filter obligations by domain
  const filteredObligations = selectedDomains.length > 0
    ? obligations.filter(ob => selectedDomains.includes(ob.domain || 'general'))
    : obligations;

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Scroll to add-documents section when hash is present
  useEffect(() => {
    if (location.hash === '#add-documents') {
      const el = document.getElementById('add-documents');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const handleUpload = (files: File[]) => {
    console.log('Files uploaded:', files);
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid lg:grid-cols-3 gap-8 mt-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  const scrollToTimeline = () => {
    const timelineSection = document.querySelector('[data-section="timeline"]');
    if (timelineSection) {
      timelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToAddDocuments = () => {
    const section = document.getElementById('add-documents');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Message */}
        <div className="mb-6 animate-fade-in flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              {isStressed ? "Let's take this step by step." : "I have your back."}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isStressed ? reassurance : "You don't need to remember everything. I will."}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ReminderPreferencesDialog />
          </div>
        </div>

        {/* At a glance stats - only when there are obligations */}
        {!obligationsLoading && obligations.length > 0 && (
          <DashboardStats obligations={obligations} className="mb-6" />
        )}

        {/* Document Upload - always at top */}
        <section
          id="add-documents"
          className="mb-6 animate-slide-up scroll-mt-20"
          aria-labelledby="add-documents-heading"
        >
          <h3 
            id="add-documents-heading" 
            className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
          >
            Add Documents
          </h3>
          <DocumentUpload onUpload={handleUpload} onObligationsSaved={refetch} />
        </section>

        {/* Reminder Banner - calm, dismissible */}
        {!obligationsLoading && obligations.length > 0 && (
          <ReminderBanner 
            obligations={obligations} 
            onScrollToTimeline={scrollToTimeline}
            className="mb-6"
          />
        )}

        {/* Today's Focus - what to do today */}
        {!obligationsLoading && (
          <TodayFocus obligations={obligations} className="mb-6 sm:mb-8 animate-fade-in" />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Empty state - when no obligations yet */}
            {!obligationsLoading && obligations.length === 0 && (
              <section 
                className="animate-slide-up rounded-xl border border-border bg-card/50 p-6 sm:p-8"
                aria-labelledby="empty-state-heading"
              >
                <EmptyState
                  title="Nothing to track yet"
                  description="Upload a document above to extract obligations and deadlines. I'll help you keep on top of what matters."
                  variant="calm"
                />
              </section>
            )}

            {/* Weekly Summary - high value, calming overview */}
            {!obligationsLoading && obligations.length > 0 && (
              <section className="animate-slide-up" aria-label="Weekly summary">
                <WeeklySummary obligations={obligations} />
              </section>
            )}

            {/* Filters and View Toggle */}
            {!obligationsLoading && obligations.length > 0 && (
              <section 
                className="animate-slide-up space-y-4" 
                style={{ animationDelay: '100ms' }}
                aria-label="View options and filters"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Filter by area
                  </h3>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <TabsList className="h-10 sm:h-8 w-full sm:w-auto">
                      <TabsTrigger 
                        value="timeline" 
                        className="h-9 sm:h-7 px-4 sm:px-3 text-sm sm:text-xs gap-2 sm:gap-1.5 flex-1 sm:flex-initial"
                      >
                        <List className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                        Timeline
                      </TabsTrigger>
                      <TabsTrigger 
                        value="subject" 
                        className="h-9 sm:h-7 px-4 sm:px-3 text-sm sm:text-xs gap-2 sm:gap-1.5 flex-1 sm:flex-initial"
                      >
                        <Folder className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                        By Subject
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <DomainFilter 
                  selectedDomains={selectedDomains} 
                  onChange={setSelectedDomains} 
                />
              </section>
            )}

            {/* Timeline or Subject View */}
            <section 
              className="animate-slide-up" 
              style={{ animationDelay: '150ms' }}
              data-section="timeline"
            >
              {obligationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : viewMode === 'timeline' ? (
                <GroupedTimeline
                  obligations={filteredObligations}
                  onStatusChange={updateStatus}
                  onUpdate={updateObligation}
                  onDelete={deleteObligation}
                />
              ) : (
                <GroupedBySubject
                  obligations={filteredObligations}
                  onStatusChange={updateStatus}
                  onUpdate={updateObligation}
                  onDelete={deleteObligation}
                />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside 
            className="space-y-4 sm:space-y-6 animate-slide-up" 
            style={{ animationDelay: '200ms' }}
            aria-label="Updates and notifications"
          >
            {/* Urgent nudge banners - in-app, dismissible */}
            {!obligationsLoading && (
              <UrgentNudgeBanner obligations={obligations} />
            )}

            <NudgesPanel
              nudges={nudges}
              onDismiss={dismissNudge}
            />

            {/* Trust Message */}
            <div className="p-4 sm:p-5 bg-secondary/50 rounded-xl" role="note">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your documents are processed securely. We do not sell or train on your data. You can delete everything at any time.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
