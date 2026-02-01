import { useState } from 'react';
import { Header } from '@/components/Header';
import { DocumentUpload } from '@/components/DocumentUpload';
import { TimelineSection } from '@/components/TimelineSection';
import { NudgesPanel } from '@/components/NudgesPanel';
import { mockObligations, mockNudges } from '@/data/mockData';
import { Obligation, ObligationStatus, NudgeMessage } from '@/types/obligation';

const Index = () => {
  const [obligations, setObligations] = useState<Obligation[]>(mockObligations);
  const [nudges, setNudges] = useState<NudgeMessage[]>(mockNudges);

  const handleStatusChange = (id: string, status: ObligationStatus) => {
    setObligations(prev =>
      prev.map(ob =>
        ob.id === id
          ? { ...ob, status, updatedAt: new Date() }
          : ob
      )
    );
  };

  const handleNudgeDismiss = (id: string) => {
    setNudges(prev =>
      prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  const handleUpload = (files: File[]) => {
    // In production, this would process documents and extract obligations
    console.log('Files uploaded:', files);
  };

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
              <TimelineSection
                obligations={obligations}
                onStatusChange={handleStatusChange}
              />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <NudgesPanel
              nudges={nudges}
              onDismiss={handleNudgeDismiss}
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
