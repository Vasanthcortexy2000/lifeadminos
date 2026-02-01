import { useState } from 'react';
import { Obligation, ObligationStatus } from '@/types/obligation';
import { RiskBadge } from './RiskBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ObligationCardProps {
  obligation: Obligation;
  onStatusChange?: (id: string, status: ObligationStatus) => void;
  className?: string;
}

const statusOptions: { value: ObligationStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function ObligationCard({ obligation, onStatusChange, className }: ObligationCardProps) {
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  
  const hasSteps = obligation.steps && obligation.steps.length > 0;

  const handleStatusChange = (value: string) => {
    if (onStatusChange) {
      onStatusChange(obligation.id, value as ObligationStatus);
    }
  };

  const formatDueDate = () => {
    if (!obligation.deadline) {
      return 'No due date found';
    }
    return format(obligation.deadline, 'MMM d, yyyy');
  };

  return (
    <div
      className={cn(
        'card-calm p-5 transition-all duration-300 hover:shadow-elevated',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Risk badge */}
          <div className="flex items-center gap-3 mb-2">
            <RiskBadge level={obligation.riskLevel} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold mb-1 text-foreground">
            {obligation.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {obligation.description}
          </p>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {obligation.sourceDocument && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{obligation.sourceDocument}</span>
              </div>
            )}

            <div className="text-muted-foreground">
              <span className="font-medium">Due:</span> {formatDueDate()}
            </div>
          </div>

          {/* Expandable steps section */}
          <Collapsible open={isStepsOpen} onOpenChange={setIsStepsOpen} className="mt-4">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isStepsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>View steps</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 pt-3 border-t border-border">
              {hasSteps ? (
                <ul className="space-y-2">
                  {obligation.steps!.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No steps found.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Status dropdown */}
        <div className="flex-shrink-0">
          <Select value={obligation.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
