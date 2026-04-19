
CREATE TYPE public.deduction_type AS ENUM (
  'accommodation_damage',
  'wrong_order',
  'equipment_loss',
  'cash_shortage',
  'uniform_damage',
  'other'
);

CREATE TYPE public.deduction_status AS ENUM ('pending', 'approved', 'deducted', 'waived');

CREATE TABLE public.deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "deductionType" public.deduction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  "incidentDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "evidenceName" TEXT,
  status public.deduction_status NOT NULL DEFAULT 'pending',
  "applyToPayrollMonth" TEXT,
  "reportedBy" UUID,
  "reportedByName" TEXT,
  "approvedAt" TIMESTAMPTZ,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deductions_company ON public.deductions ("companyId", "incidentDate" DESC);
CREATE INDEX idx_deductions_employee ON public.deductions ("employeeId");

ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers manage deductions"
  ON public.deductions FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "employee read own deductions"
  ON public.deductions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = deductions."employeeId" AND e."userId" = auth.uid()
  ));

CREATE TRIGGER trg_deductions_updated_at
  BEFORE UPDATE ON public.deductions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

INSERT INTO storage.buckets (id, name, public)
VALUES ('deduction-evidence', 'deduction-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "managers read deduction evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deduction-evidence' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));

CREATE POLICY "managers write deduction evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deduction-evidence' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));

CREATE POLICY "managers update deduction evidence"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'deduction-evidence' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));

CREATE POLICY "managers delete deduction evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deduction-evidence' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));

CREATE POLICY "employee read own deduction evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deduction-evidence'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = ((storage.foldername(name))[2])::uuid AND e."userId" = auth.uid()
    )
  );
