
-- Create table for all patient intake submissions
CREATE TABLE public.patient_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  ethnicity TEXT,
  weight NUMERIC,
  allergies TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  chief_complaint TEXT NOT NULL,
  symptom_onset TEXT,
  pain_score INTEGER DEFAULT 0,
  symptoms TEXT[] DEFAULT '{}',
  medical_history TEXT[] DEFAULT '{}',
  medications TEXT,
  wearable_heart_rate NUMERIC,
  wearable_sleep NUMERIC,
  previous_visit BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  ai_triage_level TEXT,
  ai_summary TEXT,
  red_flags TEXT[] DEFAULT '{}',
  risk_signals TEXT[] DEFAULT '{}',
  missing_questions TEXT[] DEFAULT '{}',
  nurse_decision TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (patients don't need accounts to check in)
CREATE POLICY "Anyone can submit patient intake"
  ON public.patient_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow reading all submissions (for nurse dashboard - no auth yet)
CREATE POLICY "Anyone can read submissions"
  ON public.patient_submissions
  FOR SELECT
  USING (true);

-- Allow updating submissions (for nurse decisions)
CREATE POLICY "Anyone can update submissions"
  ON public.patient_submissions
  FOR UPDATE
  USING (true);
