
-- Add wearable SpO2 column
ALTER TABLE public.patient_submissions ADD COLUMN wearable_spo2 numeric NULL;

-- Add HR trend data (array of recent HR readings)
ALTER TABLE public.patient_submissions ADD COLUMN wearable_hr_trend jsonb NULL DEFAULT NULL;

-- Add AFib detection flag and details
ALTER TABLE public.patient_submissions ADD COLUMN wearable_afib_detected boolean NULL DEFAULT NULL;
ALTER TABLE public.patient_submissions ADD COLUMN wearable_afib_details text NULL;
