import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DocumentUpload } from '@/components/DocumentUpload';
import { GroupedTimeline } from '@/components/GroupedTimeline';
import { WeeklySummary } from '@/components/WeeklySummary';
import { NudgesPanel } from '@/components/NudgesPanel';
import { UrgentNudgeBanner } from '@/components/UrgentNudgeBanner';
import { ReminderBanner } from '@/components/ReminderBanner';
import { TodayFocus } from '@/components/TodayFocus';
import { ReminderPreferencesDialog } from '@/components/ReminderPreferencesDialog';
import { DomainFilter, LifeDomain, LIFE_DOMAINS } from '@/components/LifeDomain';
import { useAuth } from '@/contexts/AuthContext';
import { useObligations } from '@/hooks/useObligations';
import { useNudges } from '@/hooks/useNudges';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedDomains, setSelectedDomains] = useState<LifeDomain[]>([]);
  const { 
    obligations, 
    loading: obligationsLoading, 
    updateStatus, 
    updateObligation,
    deleteObligation, 
    refetch 
  } = useObligations();
  const { nudges, dismissNudge } = useNudges();

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome Message */}
        <div className="mb-6 animate-fade-in flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              I have your back.
            </h2>
            <p className="text-muted-foreground">
              You don't need to remember everything. I will.
            </p>
          </div>
          <ReminderPreferencesDialog />
        </div>

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
          <TodayFocus obligations={obligations} className="mb-8 animate-fade-in" />
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Weekly Summary - high value, calming overview */}
            {!obligationsLoading && obligations.length > 0 && (
              <section className="animate-slide-up">
                <WeeklySummary obligations={obligations} />
              </section>
            )}

            {/* Document Upload */}
            <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Add Documents
              </h3>
              <DocumentUpload onUpload={handleUpload} onObligationsSaved={refetch} />
            </section>

            {/* Domain Filter */}
            {!obligationsLoading && obligations.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Filter by area
                </h3>
                <DomainFilter 
                  selectedDomains={selectedDomains} 
                  onChange={setSelectedDomains} 
                />
              </section>
            )}

            {/* Timeline */}
            <section 
              className="animate-slide-up" 
              style={{ animationDelay: '200ms' }}
              data-section="timeline"
            >
              {obligationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <GroupedTimeline
                  obligations={filteredObligations}
                  onStatusChange={updateStatus}
                  onUpdate={updateObligation}
                  onDelete={deleteObligation}
                />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            {/* Urgent nudge banners - in-app, dismissible */}
            {!obligationsLoading && (
              <UrgentNudgeBanner obligations={obligations} />
            )}

            <NudgesPanel
              nudges={nudges}
              onDismiss={dismissNudge}
            />

            {/* Trust Message */}
            <div className="p-5 bg-secondary/50 rounded-xl">
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
