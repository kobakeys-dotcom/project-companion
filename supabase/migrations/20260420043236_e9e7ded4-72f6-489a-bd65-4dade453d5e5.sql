ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS "lastPromotionDate" date,
  ADD COLUMN IF NOT EXISTS "contractType" text,
  ADD COLUMN IF NOT EXISTS "contractSignedDate" date,
  ADD COLUMN IF NOT EXISTS "contractExpiryDate" date,
  ADD COLUMN IF NOT EXISTS "dateOfBirth" date,
  ADD COLUMN IF NOT EXISTS "permanentAddress" text,
  ADD COLUMN IF NOT EXISTS "fixedAllowance" numeric,
  ADD COLUMN IF NOT EXISTS "dutyAllowance" numeric,
  ADD COLUMN IF NOT EXISTS "attendanceAllowance" numeric,
  ADD COLUMN IF NOT EXISTS "additionalServiceAllowance" numeric;