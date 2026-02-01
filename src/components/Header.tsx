import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Life Admin OS</h1>
            <p className="text-xs text-muted-foreground">Your responsibility guardian</p>
          </div>
        </div>
      </div>
    </header>
  );
}
