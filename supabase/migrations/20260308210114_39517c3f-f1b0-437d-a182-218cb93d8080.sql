
-- Add appointment fields to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS appointment_date date,
ADD COLUMN IF NOT EXISTS appointment_time time,
ADD COLUMN IF NOT EXISTS callback_date date,
ADD COLUMN IF NOT EXISTS callback_notes text;

-- Add new prospect statuses for appointment workflow
-- We need to add 'rdv_planifie' and 'a_rappeler' to the enum
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'rdv_planifie';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'a_rappeler';
