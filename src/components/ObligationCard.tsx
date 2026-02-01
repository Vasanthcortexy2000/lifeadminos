import { useState } from 'react';
import { Obligation, ObligationStatus } from '@/types/obligation';
import { RiskBadge } from './RiskBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileText, ChevronDown, ChevronUp, Check } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

interface ObligationCardProps {
  obligation: Obligation;
  onStatusChange?: (id: string, status: ObligationStatus) => Promise<void> | void;
  className?: string;
}

const statusOptions: { value: ObligationStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function ObligationCard({ obligation, onStatusChange, className }: ObligationCardProps) {
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  const hasSteps = obligation.steps && obligation.steps.length > 0;

  const handleStatusChange = async (value: string) => {
    if (onStatusChange) {
      setIsSaving(true);
      try {
        await onStatusChange(obligation.id, value as ObligationStatus);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } catch {
        // Error is handled in the hook
      } finally {
        setIsSaving(false);
      }
    }
  };

  const toggleStep = (index: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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

          {/* Description/Summary */}
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

          {/* Expandable steps section with checklist */}
          <Collapsible open={isStepsOpen} onOpenChange={setIsStepsOpen} className="mt-4">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isStepsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>View steps</span>
              {hasSteps && checkedSteps.size > 0 && (
                <span className="text-xs">
                  ({checkedSteps.size}/{obligation.steps!.length} done)
                </span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 pt-3 border-t border-border">
              {hasSteps ? (
                <ul className="space-y-2">
                  {obligation.steps!.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Checkbox
                        id={`step-${obligation.id}-${index}`}
                        checked={checkedSteps.has(index)}
                        onCheckedChange={() => toggleStep(index)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`step-${obligation.id}-${index}`}
                        className={cn(
                          'text-sm cursor-pointer transition-colors',
                          checkedSteps.has(index)
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        )}
                      >
                        {step}
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No steps found.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Status dropdown with save indicator */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <Select 
            value={obligation.status} 
            onValueChange={handleStatusChange}
            disabled={isSaving}
          >
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
          
          {/* Save confirmation */}
          <div className={cn(
            'flex items-center gap-1 text-xs transition-opacity duration-300',
            showSaved ? 'opacity-100' : 'opacity-0'
          )}>
            <Check className="w-3 h-3 text-[hsl(var(--status-completed))]" />
            <span className="text-muted-foreground">Saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
