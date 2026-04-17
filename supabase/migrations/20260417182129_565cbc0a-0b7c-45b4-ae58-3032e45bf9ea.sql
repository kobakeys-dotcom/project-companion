ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS "clockInSelfieUrl" text,
  ADD COLUMN IF NOT EXISTS "clockOutSelfieUrl" text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;