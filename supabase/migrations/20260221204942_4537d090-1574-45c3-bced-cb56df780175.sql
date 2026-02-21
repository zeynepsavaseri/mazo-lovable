
-- Add queue_order column for manual patient ordering
ALTER TABLE public.patient_submissions
ADD COLUMN queue_order integer DEFAULT 0;

-- Create index for efficient ordering
CREATE INDEX idx_patient_submissions_queue_order ON public.patient_submissions (queue_order);
