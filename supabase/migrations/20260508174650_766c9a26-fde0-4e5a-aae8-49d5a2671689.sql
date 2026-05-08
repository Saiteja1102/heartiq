-- Add doctor_id column to consultations
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS doctor_id UUID;

-- Index for faster doctor appointment lookups
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON public.consultations(doctor_id);

-- Allow doctors to view their appointments
DROP POLICY IF EXISTS "consult_select_doctor" ON public.consultations;
CREATE POLICY "consult_select_doctor" ON public.consultations
  FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id);

-- Allow doctors to update appointment status
DROP POLICY IF EXISTS "consult_update_doctor" ON public.consultations;
CREATE POLICY "consult_update_doctor" ON public.consultations
  FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id);

-- Ensure patients can still insert appointments
DROP POLICY IF EXISTS "consult_insert_own" ON public.consultations;
CREATE POLICY "consult_insert_own" ON public.consultations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);