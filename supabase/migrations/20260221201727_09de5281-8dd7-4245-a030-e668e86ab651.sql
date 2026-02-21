
-- Add status column to track patient queue state
ALTER TABLE public.patient_submissions ADD COLUMN status text NOT NULL DEFAULT 'waiting';

-- Update existing records that already have a nurse decision to 'in_treatment'
UPDATE public.patient_submissions SET status = 'in_treatment' WHERE nurse_decision IS NOT NULL;
