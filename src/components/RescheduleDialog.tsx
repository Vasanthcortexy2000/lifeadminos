import { useState } from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Obligation } from '@/types/obligation';
import { format } from 'date-fns';

interface RescheduleDialogProps {
  obligation: Obligation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onReschedule: (newDate: Date) => void;
}

export function RescheduleDialog({ 
  obligation, 
  open, 
  onOpenChange, 
  onComplete, 
  onReschedule 
}: RescheduleDialogProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleReschedule = () => {
    if (selectedDate) {
      onReschedule(selectedDate);
      onOpenChange(false);
      setSelectedDate(undefined);
      setShowDatePicker(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            This item may need attention
          </DialogTitle>
          <DialogDescription className="pt-2">
            <span className="font-medium text-foreground">{obligation.title}</span>
            <span className="block mt-1 text-muted-foreground">
              No rush — would you like to mark it complete or choose a new date?
            </span>
          </DialogDescription>
        </DialogHeader>

        {!showDatePicker ? (
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="default"
              className="w-full justify-start gap-3"
              onClick={handleComplete}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as completed
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-3"
              onClick={() => setShowDatePicker(true)}
            >
              <Calendar className="w-4 h-4" />
              Reschedule to a new date
            </Button>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Choose a new due date:
            </p>
            <div className="flex justify-center">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </div>
            {selectedDate && (
              <p className="text-sm text-center mt-3 text-muted-foreground">
                New due date: <span className="font-medium text-foreground">{format(selectedDate, 'PPP')}</span>
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {showDatePicker ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDatePicker(false);
                  setSelectedDate(undefined);
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={!selectedDate}
              >
                Confirm new date
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Not now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
