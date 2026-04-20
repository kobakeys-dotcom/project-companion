ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS "pensionEnabled" boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "pensionPercentage" numeric NOT NULL DEFAULT 0;