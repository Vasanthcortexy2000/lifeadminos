import { useState, useEffect, useCallback } from 'react';
import { Obligation, ObligationStatus, ObligationUpdate, RiskLevel } from '@/types/obligation';
import { RiskBadge } from './RiskBadge';
import { DueDateBadge } from './DueDateBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DomainBadge, DomainSelector, LifeDomain } from './LifeDomain';
import { RescheduleDialog } from './RescheduleDialog';
import { EvidenceAttachment } from './EvidenceAttachment';
import { ShareObligation } from './ShareObligation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDueDateStatus } from '@/lib/dateUtils';
import { buildGoogleCalendarEventUrl } from '@/lib/googleCalendar';
import { 
  FileText, ChevronDown, ChevronUp, Check, Plus, Trash2, 
  Loader2, Pencil, X, AlertCircle, Calendar, CalendarPlus
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Evidence {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_at: string;
}

interface Share {
  id: string;
  share_token: string;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
}

interface ObligationCardProps {
  obligation: Obligation;
  onStatusChange?: (id: string, status: ObligationStatus) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: ObligationUpdate) => Promise<void>;
  onStepsUpdate?: (id: string, steps: string[]) => void;
  className?: string;
}

const statusOptions: { value: ObligationStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const riskOptions: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: 'Low priority' },
  { value: 'medium', label: 'Medium priority' },
  { value: 'high', label: 'High priority' },
];

export function ObligationCard({ 
  obligation, 
  onStatusChange, 
  onDelete, 
  onUpdate,
  onStepsUpdate, 
  className 
}: ObligationCardProps) {
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [localSteps, setLocalSteps] = useState<string[]>(obligation.steps || []);
  const [newStep, setNewStep] = useState('');
  const [isSavingSteps, setIsSavingSteps] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepValue, setEditStepValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(obligation.title);
  const [editDescription, setEditDescription] = useState(obligation.description);
  const [editDeadline, setEditDeadline] = useState(
    obligation.deadline ? format(obligation.deadline, 'yyyy-MM-dd') : ''
  );
  const [editRiskLevel, setEditRiskLevel] = useState(obligation.riskLevel);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reschedule dialog state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);

  // Evidence and sharing state
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const { user } = useAuth();

  const hasSteps = localSteps.length > 0;
  const isCompleted = obligation.status === 'completed';
  const dueDateStatus = getDueDateStatus(obligation.deadline);
  const isOverdue = dueDateStatus === 'overdue' && !isCompleted;
  const googleCalUrl = buildGoogleCalendarEventUrl(obligation);

  // Sync local steps with prop changes
  useEffect(() => {
    setLocalSteps(obligation.steps || []);
  }, [obligation.steps]);

  // Fetch evidence and shares
  const fetchEvidenceAndShares = useCallback(async () => {
    if (!user) return;

    const [evidenceResult, sharesResult] = await Promise.all([
      supabase
        .from('obligation_evidence')
        .select('*')
        .eq('obligation_id', obligation.id)
        .eq('user_id', user.id),
      supabase
        .from('obligation_shares')
        .select('*')
        .eq('obligation_id', obligation.id)
        .eq('user_id', user.id),
    ]);

    if (evidenceResult.data) setEvidence(evidenceResult.data);
    if (sharesResult.data) setShares(sharesResult.data);
  }, [user, obligation.id]);

  useEffect(() => {
    fetchEvidenceAndShares();
  }, [fetchEvidenceAndShares]);

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
      const adjusted = new Set<number>();
      next.forEach(i => {
        if (i > index) adjusted.add(i - 1);
        else adjusted.add(i);
      });
      return adjusted;
    });
    await saveStepsToDb(updatedSteps);
  };

  const handleStartStepEdit = (index: number) => {
    setEditingStepIndex(index);
    setEditStepValue(localSteps[index]);
  };

  const handleSaveStepEdit = async () => {
    if (editingStepIndex === null) return;
    if (!editStepValue.trim()) {
      handleRemoveStep(editingStepIndex);
    } else {
      const updatedSteps = [...localSteps];
      updatedSteps[editingStepIndex] = editStepValue.trim();
      setLocalSteps(updatedSteps);
      await saveStepsToDb(updatedSteps);
    }
    setEditingStepIndex(null);
    setEditStepValue('');
  };

  const handleCancelStepEdit = () => {
    setEditingStepIndex(null);
    setEditStepValue('');
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(obligation.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditTitle(obligation.title);
    setEditDescription(obligation.description);
    setEditDeadline(obligation.deadline ? format(obligation.deadline, 'yyyy-MM-dd') : '');
    setEditRiskLevel(obligation.riskLevel);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onUpdate) return;
    
    setIsSavingEdit(true);
    try {
      await onUpdate(obligation.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        deadline: editDeadline ? new Date(editDeadline) : null,
        riskLevel: editRiskLevel,
      });
      setIsEditing(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch {
      // Error handled in hook
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle reschedule
  const handleReschedule = async (newDate: Date) => {
    if (!onUpdate) return;
    await onUpdate(obligation.id, { deadline: newDate });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleCompleteFromDialog = async () => {
    if (!onStatusChange) return;
    await onStatusChange(obligation.id, 'completed');
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // Completed card styling
  const cardClasses = cn(
    'card-calm p-5 transition-all duration-300',
    isCompleted ? 'opacity-60' : 'hover:shadow-elevated',
    dueDateStatus === 'overdue' && !isCompleted && 'border-l-4 border-l-[hsl(var(--risk-high))]',
    dueDateStatus === 'due-soon' && !isCompleted && 'border-l-4 border-l-[hsl(var(--risk-medium))]',
    className
  );

  // Editing mode
  if (isEditing) {
    return (
      <div className={cardClasses}>
        <div className="space-y-4">
          <div>
            <label htmlFor={`edit-title-${obligation.id}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
            <Input
              id={`edit-title-${obligation.id}`}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Obligation title"
              className="text-base min-h-[44px]"
            />
          </div>
          
          <div>
            <label htmlFor={`edit-desc-${obligation.id}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">Summary</label>
            <Textarea
              id={`edit-desc-${obligation.id}`}
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="What is this obligation about?"
              rows={2}
              className="min-h-[88px]"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`edit-deadline-${obligation.id}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">Due date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id={`edit-deadline-${obligation.id}`}
                  type="date"
                  value={editDeadline}
                  onChange={e => setEditDeadline(e.target.value)}
                  className="pl-10 min-h-[44px]"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priority level</label>
              <Select value={editRiskLevel} onValueChange={v => setEditRiskLevel(v as RiskLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {riskOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editTitle.trim()}>
              {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
            <Button variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className={cardClasses} aria-labelledby={`obligation-title-${obligation.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Top badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-2" role="list" aria-label="Obligation details">
            <RiskBadge level={obligation.riskLevel} />
            <DueDateBadge deadline={obligation.deadline} />
            {obligation.domain && obligation.domain !== 'general' && (
              <DomainBadge domain={obligation.domain} />
            )}
            {obligation.confidence !== undefined && (
              <ConfidenceBadge confidence={obligation.confidence} />
            )}
          </div>

          {/* Title */}
          <h3 
            id={`obligation-title-${obligation.id}`}
            className={cn(
              'text-base sm:text-lg font-semibold mb-1',
              isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
            )}
          >
            {obligation.title}
          </h3>

          {/* Description/Summary */}
          <p className={cn(
            'text-sm mb-3 line-clamp-2',
            isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'
          )}>
            {obligation.description}
          </p>

          {/* Consequence - prominently displayed for high-risk items */}
          {obligation.consequence && (
            <div className={cn(
              'flex items-start gap-2 p-3 rounded-lg mb-3 text-sm',
              obligation.riskLevel === 'high' && !isCompleted
                ? 'bg-[hsl(var(--risk-high-bg))]'
                : 'bg-secondary'
            )}>
              <AlertCircle className={cn(
                'w-4 h-4 flex-shrink-0 mt-0.5',
                obligation.riskLevel === 'high' && !isCompleted
                  ? 'text-[hsl(var(--risk-high))]'
                  : 'text-muted-foreground'
              )} />
              <span className={cn(
                isCompleted ? 'text-muted-foreground/70' : 'text-foreground'
              )}>
                {obligation.consequence}
              </span>
            </div>
          )}

          {/* Source document */}
          {obligation.sourceDocument && obligation.sourceDocument !== 'Unknown' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>From: {obligation.sourceDocument}</span>
              {obligation.createdAt && (
                <span className="text-muted-foreground/60">
                  · Added {format(obligation.createdAt, 'MMM d, yyyy')}
                </span>
              )}
            </div>
          )}

          {/* Evidence, Share, Add to Google Calendar, and Overdue actions */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3">
            <EvidenceAttachment 
              obligationId={obligation.id}
              evidence={evidence}
              onEvidenceChange={fetchEvidenceAndShares}
            />
            <ShareObligation 
              obligationId={obligation.id}
              obligationTitle={obligation.title}
              existingShares={shares}
              onShareChange={fetchEvidenceAndShares}
            />
            {googleCalUrl && (
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0 py-2 sm:py-0"
                aria-label={`Add ${obligation.title} to Google Calendar`}
              >
                <CalendarPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Add to Google Calendar</span>
                <span className="sm:hidden">Calendar</span>
              </a>
            )}
            {isOverdue && (
              <button
                onClick={() => setShowRescheduleDialog(true)}
                className="text-xs text-[hsl(var(--priority-high))] hover:underline min-h-[44px] sm:min-h-0 py-2 sm:py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label="Reschedule this overdue obligation"
              >
                Ready to reschedule?
              </button>
            )}
          </div>

          {/* Steps section */}
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
                      {editingStepIndex === index ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editStepValue}
                            onChange={e => setEditStepValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveStepEdit();
                              if (e.key === 'Escape') handleCancelStepEdit();
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveStepEdit} className="h-7 px-2">
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor={`step-${obligation.id}-${index}`}
                            onClick={e => {
                              e.preventDefault();
                              handleStartStepEdit(index);
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

        {/* Right column: status, edit, delete */}
        <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
          <Select 
            value={obligation.status} 
            onValueChange={handleStatusChange}
            disabled={isSaving}
          >
            <SelectTrigger 
              className={cn(
                'w-[130px] sm:w-[140px] border-0 min-h-[44px] sm:min-h-[36px]',
                isCompleted ? 'bg-[hsl(var(--status-completed))]/10' : 'bg-secondary'
              )}
              aria-label={`Status: ${obligation.status}`}
            >
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
          <div 
            className={cn(
              'flex items-center gap-1 text-xs transition-opacity duration-300',
              showSaved ? 'opacity-100' : 'opacity-0'
            )}
            role="status"
            aria-live="polite"
          >
            <Check className="w-3 h-3 text-[hsl(var(--status-completed))]" aria-hidden="true" />
            <span className="text-muted-foreground">Saved</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Edit button */}
            <button
              onClick={handleStartEdit}
              className="p-2 sm:p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Edit ${obligation.title}`}
            >
              <Pencil className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
            </button>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 sm:p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label={`Delete ${obligation.title}`}
            >
              {isDeleting ? (
                <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        obligation={obligation}
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        onComplete={handleCompleteFromDialog}
        onReschedule={handleReschedule}
      />
    </article>
  );
}
