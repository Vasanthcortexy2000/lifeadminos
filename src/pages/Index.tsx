import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { DocumentUpload } from '@/components/DocumentUpload';
import { TimelineSection } from '@/components/TimelineSection';
import { NudgesPanel } from '@/components/NudgesPanel';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useObligations } from '@/hooks/useObligations';
import { useNudges } from '@/hooks/useNudges';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { obligations, loading: obligationsLoading, updateStatus } = useObligations();
  const { nudges, dismissNudge } = useNudges();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleUpload = (files: File[]) => {
    // In production, this would process documents and extract obligations
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome Message */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            I have your back.
          </h2>
          <p className="text-muted-foreground">
            You don't need to remember everything. I will.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Document Upload */}
            <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Add Documents
              </h3>
              <DocumentUpload onUpload={handleUpload} />
            </section>

            {/* Timeline */}
            <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              {obligationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : obligations.length === 0 ? (
                <EmptyState
                  title="No obligations yet"
                  description="Upload a document to get started. I'll extract your deadlines and keep track of them for you."
                />
              ) : (
                <TimelineSection
                  obligations={obligations}
                  onStatusChange={updateStatus}
                />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <NudgesPanel
              nudges={nudges}
              onDismiss={dismissNudge}
            />

            {/* Trust Message */}
            <div className="p-5 bg-secondary/50 rounded-xl">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your documents are processed locally. We do not sell or train on your data. You can delete everything at any time.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
