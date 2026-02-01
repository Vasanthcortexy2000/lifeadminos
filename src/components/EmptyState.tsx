import { FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  variant?: 'default' | 'calm';
}

export function EmptyState({ title, description, variant = 'default' }: EmptyStateProps) {
  const isCalm = variant === 'calm';
  
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center mb-4",
        isCalm ? "bg-[hsl(var(--risk-low-bg))]" : "bg-secondary"
      )}>
        {isCalm ? (
          <CheckCircle2 className="w-7 h-7 text-[hsl(var(--status-completed))]" />
        ) : (
          <FileText className="w-7 h-7 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}
