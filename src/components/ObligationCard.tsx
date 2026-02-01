import { useState } from 'react';
import { Obligation, ObligationStatus } from '@/types/obligation';
import { RiskBadge } from './RiskBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileText, ChevronDown, ChevronUp, Check, Plus, Trash2, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ObligationCardProps {
  obligation: Obligation;
  onStatusChange?: (id: string, status: ObligationStatus) => Promise<void> | void;
  onStepsUpdate?: (id: string, steps: string[]) => void;
  className?: string;
}

const statusOptions: { value: ObligationStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function ObligationCard({ obligation, onStatusChange, onStepsUpdate, className }: ObligationCardProps) {
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [localSteps, setLocalSteps] = useState<string[]>(obligation.steps || []);
  const [newStep, setNewStep] = useState('');
  const [isSavingSteps, setIsSavingSteps] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const hasSteps = localSteps.length > 0;

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

  const saveStepsToDb = async (steps: string[]) => {
    setIsSavingSteps(true);
    try {
      const { error } = await supabase
        .from('obligations')
        .update({ steps, updated_at: new Date().toISOString() })
        .eq('id', obligation.id);

      if (error) throw error;

      onStepsUpdate?.(obligation.id, steps);
      toast({
        title: 'Steps updated',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      console.error('Error saving steps:', error);
      toast({
        title: "Couldn't save steps",
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSteps(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    const updatedSteps = [...localSteps, newStep.trim()];
    setLocalSteps(updatedSteps);
    setNewStep('');
    await saveStepsToDb(updatedSteps);
  };

  const handleRemoveStep = async (index: number) => {
    const updatedSteps = localSteps.filter((_, i) => i !== index);
    setLocalSteps(updatedSteps);
    setCheckedSteps(prev => {
      const next = new Set(prev);
      next.delete(index);
      // Adjust indices for items after the removed one
      const adjusted = new Set<number>();
      next.forEach(i => {
        if (i > index) adjusted.add(i - 1);
        else adjusted.add(i);
      });
      return adjusted;
    });
    await saveStepsToDb(updatedSteps);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(localSteps[index]);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;
    if (!editValue.trim()) {
      handleRemoveStep(editingIndex);
    } else {
      const updatedSteps = [...localSteps];
      updatedSteps[editingIndex] = editValue.trim();
      setLocalSteps(updatedSteps);
      await saveStepsToDb(updatedSteps);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
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

          {/* Steps section - only show if has steps */}
          {hasSteps ? (
            <Collapsible open={isStepsOpen} onOpenChange={setIsStepsOpen} className="mt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isStepsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>View steps</span>
                {checkedSteps.size > 0 && (
                  <span className="text-xs">
                    ({checkedSteps.size}/{localSteps.length} done)
                  </span>
                )}
                {isSavingSteps && <Loader2 className="w-3 h-3 animate-spin" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 pt-3 border-t border-border">
                <ul className="space-y-2">
                  {localSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3 group">
                      <Checkbox
                        id={`step-${obligation.id}-${index}`}
                        checked={checkedSteps.has(index)}
                        onCheckedChange={() => toggleStep(index)}
                        className="mt-0.5"
                      />
                      {editingIndex === index ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-7 px-2">
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor={`step-${obligation.id}-${index}`}
                            onClick={e => {
                              e.preventDefault();
                              handleStartEdit(index);
                            }}
                            className={cn(
                              'flex-1 text-sm cursor-pointer transition-colors',
                              checkedSteps.has(index)
                                ? 'text-muted-foreground line-through'
                                : 'text-foreground hover:text-primary'
                            )}
                          >
                            {step}
                          </label>
                          <button
                            onClick={() => handleRemoveStep(index)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                            title="Remove step"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Add new step */}
                <div className="flex gap-2 mt-3">
                  <Input
                    value={newStep}
                    onChange={e => setNewStep(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddStep();
                    }}
                    placeholder="Add a step..."
                    className="h-8 text-sm"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleAddStep}
                    disabled={!newStep.trim() || isSavingSteps}
                    className="h-8 px-2"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground italic">
              Steps will appear once this is analysed further.
            </p>
          )}
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
