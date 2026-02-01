import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence);
  
  const config = {
    high: {
      label: 'High confidence',
      icon: CheckCircle2,
      className: 'text-[hsl(var(--status-completed))]',
      tooltip: 'The AI is confident about this extraction.',
    },
    medium: {
      label: 'Medium confidence',
      icon: HelpCircle,
      className: 'text-[hsl(var(--risk-medium))]',
      tooltip: 'Consider reviewing this obligation for accuracy.',
    },
    low: {
      label: 'Low confidence',
      icon: AlertCircle,
      className: 'text-[hsl(var(--risk-high))]',
      tooltip: 'Please review and edit this obligation — the AI is less certain.',
    },
  };
  
  const { label, icon: Icon, className: iconClass, tooltip } = config[level];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5 text-xs', className)}>
            <Icon className={cn('w-3.5 h-3.5', iconClass)} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
