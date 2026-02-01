import { useEffect, useState } from 'react';
import { ExtractedObligation, RiskLevel } from '@/types/obligation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RiskBadge } from './RiskBadge';
import { Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewObligationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligations: ExtractedObligation[];
  documentName: string;
  onConfirm: (obligations: ExtractedObligation[]) => Promise<void>;
  onSaveAnyway: (obligations: ExtractedObligation[]) => Promise<void>;
}

interface EditableObligation extends ExtractedObligation {
  _id: string;
  _expanded: boolean;
}

export function ReviewObligationsModal({
  open,
  onOpenChange,
  obligations: initialObligations,
  documentName,
  onConfirm,
  onSaveAnyway,
}: ReviewObligationsModalProps) {
  const [obligations, setObligations] = useState<EditableObligation[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Keep local editable state in sync with new analysis results.
  // Without this, the modal can get stuck showing 0 obligations forever.
  useEffect(() => {
    if (!open) return;
    setObligations(
      (initialObligations || []).map((ob, i) => ({
        ...ob,
        _id: `${i}-${Date.now()}`,
        _expanded: false,
      }))
    );
  }, [open, initialObligations]);

  const updateObligation = (id: string, updates: Partial<ExtractedObligation>) => {
    setObligations(prev =>
      prev.map(ob => (ob._id === id ? { ...ob, ...updates } : ob))
    );
  };

  const toggleExpanded = (id: string) => {
    setObligations(prev =>
      prev.map(ob => (ob._id === id ? { ...ob, _expanded: !ob._expanded } : ob))
    );
  };

  const deleteObligation = (id: string) => {
    setObligations(prev => prev.filter(ob => ob._id !== id));
  };

  const updateStep = (obligationId: string, stepIndex: number, value: string) => {
    setObligations(prev =>
      prev.map(ob => {
        if (ob._id === obligationId) {
          const newSteps = [...ob.steps];
          newSteps[stepIndex] = value;
          return { ...ob, steps: newSteps };
        }
        return ob;
      })
    );
  };

  const addStep = (obligationId: string) => {
    setObligations(prev =>
      prev.map(ob => {
        if (ob._id === obligationId && ob.steps.length < 5) {
          return { ...ob, steps: [...ob.steps, ''] };
        }
        return ob;
      })
    );
  };

  const removeStep = (obligationId: string, stepIndex: number) => {
    setObligations(prev =>
      prev.map(ob => {
        if (ob._id === obligationId) {
          const newSteps = ob.steps.filter((_, i) => i !== stepIndex);
          return { ...ob, steps: newSteps };
        }
        return ob;
      })
    );
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const cleanObligations = obligations.map(({ _id, _expanded, ...rest }) => rest);
      await onConfirm(cleanObligations);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnyway = async () => {
    setIsSaving(true);
    try {
      const cleanObligations = obligations.map(({ _id, _expanded, ...rest }) => rest);
      await onSaveAnyway(cleanObligations);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const lowConfidenceCount = obligations.filter(ob => ob.confidence < 0.7).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Review extracted obligations</DialogTitle>
          <DialogDescription>
            I found {obligations.length} potential obligation{obligations.length !== 1 ? 's' : ''} in{' '}
            <span className="font-medium">{documentName}</span>. Review and edit before saving.
          </DialogDescription>
        </DialogHeader>

        {lowConfidenceCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent text-accent-foreground text-sm border border-border">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[hsl(var(--risk-medium))]" />
            <span>
              {lowConfidenceCount} item{lowConfidenceCount !== 1 ? 's' : ''} may need review (lower confidence)
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {obligations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No obligations to review. The document may not contain actionable items.
            </div>
          ) : (
            obligations.map(ob => (
              <div
                key={ob._id}
                className={cn(
                  'border rounded-lg p-4 transition-all',
                  ob.confidence < 0.7 && 'border-[hsl(var(--risk-medium))]'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    {/* Title row */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={ob.title}
                        onChange={e => updateObligation(ob._id, { title: e.target.value.slice(0, 60) })}
                        className="font-medium"
                        placeholder="Title"
                      />
                      <RiskBadge level={ob.risk_level} />
                      {ob.confidence < 0.7 && (
                        <span className="text-xs text-[hsl(var(--risk-medium))] whitespace-nowrap">
                          {Math.round(ob.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>

                    {/* Due date and risk level */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Due:</Label>
                        <Input
                          type="date"
                          value={ob.due_date || ''}
                          onChange={e => updateObligation(ob._id, { due_date: e.target.value || null })}
                          className="w-40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Risk:</Label>
                        <Select
                          value={ob.risk_level}
                          onValueChange={(v: RiskLevel) => updateObligation(ob._id, { risk_level: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Expand/collapse for steps */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(ob._id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ob._expanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span>Edit steps ({ob.steps.length})</span>
                    </button>

                    {ob._expanded && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {ob.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <Input
                              value={step}
                              onChange={e => updateStep(ob._id, i, e.target.value)}
                              placeholder={`Step ${i + 1}`}
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => removeStep(ob._id, i)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {ob.steps.length < 5 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addStep(ob._id)}
                            className="text-muted-foreground"
                          >
                            + Add step
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => deleteObligation(ob._id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove this obligation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          {lowConfidenceCount > 0 && (
            <Button variant="outline" onClick={handleSaveAnyway} disabled={isSaving}>
              Save anyway
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={isSaving || obligations.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              `Confirm & save${obligations.length > 0 ? ` (${obligations.length})` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
