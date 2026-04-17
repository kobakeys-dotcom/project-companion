ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS "foodAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "accommodationAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "otherAllowance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "earnedSalary" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.compensation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "effectiveDate" date NOT NULL,
  salary integer NOT NULL DEFAULT 0,
  reason text,
  "approvedBy" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comp_history_employee_idx
  ON public.compensation_history ("employeeId", "effectiveDate" DESC);

ALTER TABLE public.compensation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read compensation_history"
  ON public.compensation_history FOR SELECT TO authenticated
  USING (public.is_company_member("companyId"));

CREATE POLICY "managers manage compensation_history"
  ON public.compensation_history FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));

CREATE TRIGGER set_comp_history_updated_at
  BEFORE UPDATE ON public.compensation_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();