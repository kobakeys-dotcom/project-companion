-- Add a short, human-friendly Employee Code (e.g., "EMP-001") used for portal login.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS "employeeCode" text;

-- Unique per company (case-insensitive). Allows NULLs (existing employees).
CREATE UNIQUE INDEX IF NOT EXISTS employees_company_code_unique
  ON public.employees ("companyId", lower("employeeCode"))
  WHERE "employeeCode" IS NOT NULL;

-- Lookup function: given an employee code, return that employee's email.
-- SECURITY DEFINER so it works for unauthenticated visitors on the login page.
CREATE OR REPLACE FUNCTION public.email_for_employee_code(_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.employees
  WHERE lower("employeeCode") = lower(_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.email_for_employee_code(text) TO anon, authenticated;