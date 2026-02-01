-- Allow obligations without a due date (needed for the "No Due Date" timeline group)
ALTER TABLE public.obligations
  ALTER COLUMN deadline DROP NOT NULL;
