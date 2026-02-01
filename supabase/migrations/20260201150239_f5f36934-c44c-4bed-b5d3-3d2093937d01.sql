-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  obligation_id UUID NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pre_due', 'day_of', 'overdue')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app')),
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
ON public.reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
ON public.reminders FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient querying of pending reminders
CREATE INDEX idx_reminders_pending ON public.reminders (reminder_time, sent) WHERE sent = false;
CREATE INDEX idx_reminders_obligation ON public.reminders (obligation_id);
CREATE INDEX idx_reminders_user ON public.reminders (user_id);