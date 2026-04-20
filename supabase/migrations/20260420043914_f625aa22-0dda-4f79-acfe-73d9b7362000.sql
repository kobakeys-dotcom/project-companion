ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS "fixedAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dutyAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attendanceAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "livingAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "additionalServiceAllowance" integer NOT NULL DEFAULT 0;

ALTER TABLE public.payroll_records
  DROP COLUMN IF EXISTS "foodAllowance",
  DROP COLUMN IF EXISTS "accommodationAllowance",
  DROP COLUMN IF EXISTS "otherAllowance";