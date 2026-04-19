
-- ==========================================
-- SERVICE CHARGES
-- ==========================================

CREATE TYPE public.service_charge_outlet_type AS ENUM ('restaurant', 'guest_house', 'other');
CREATE TYPE public.service_charge_distribution AS ENUM ('equal', 'weighted');
CREATE TYPE public.service_charge_payout_status AS ENUM ('pending', 'paid');

CREATE TABLE public.service_charge_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "outletName" TEXT NOT NULL,
  "outletType" public.service_charge_outlet_type NOT NULL DEFAULT 'restaurant',
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "totalAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  "distributionMethod" public.service_charge_distribution NOT NULL DEFAULT 'equal',
  notes TEXT,
  "createdBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scp_company_period ON public.service_charge_pools ("companyId", "periodStart" DESC);

ALTER TABLE public.service_charge_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers manage service_charge_pools"
  ON public.service_charge_pools FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "members read service_charge_pools"
  ON public.service_charge_pools FOR SELECT TO authenticated
  USING (public.is_company_member("companyId"));

CREATE TRIGGER trg_scp_updated_at
  BEFORE UPDATE ON public.service_charge_pools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();


CREATE TABLE public.service_charge_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "poolId" UUID NOT NULL REFERENCES public.service_charge_pools(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  weight NUMERIC(8,2) NOT NULL DEFAULT 1,
  "shareAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "payoutStatus" public.service_charge_payout_status NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMPTZ,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("poolId", "employeeId")
);

CREATE INDEX idx_scs_pool ON public.service_charge_shares ("poolId");
CREATE INDEX idx_scs_employee ON public.service_charge_shares ("employeeId");

ALTER TABLE public.service_charge_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers manage service_charge_shares"
  ON public.service_charge_shares FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "employee read own service_charge_shares"
  ON public.service_charge_shares FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = service_charge_shares."employeeId" AND e."userId" = auth.uid()
  ));

CREATE TRIGGER trg_scs_updated_at
  BEFORE UPDATE ON public.service_charge_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();


-- ==========================================
-- DISCIPLINARY RECORDS
-- ==========================================

CREATE TYPE public.disciplinary_action_type AS ENUM (
  'verbal_warning',
  'warning_letter_1',
  'warning_letter_2',
  'warning_letter_3',
  'suspension',
  'termination',
  'resignation'
);

CREATE TYPE public.disciplinary_status AS ENUM ('active', 'expired', 'revoked', 'acknowledged');

CREATE TABLE public.disciplinary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "actionType" public.disciplinary_action_type NOT NULL,
  "incidentDate" DATE NOT NULL,
  "issuedDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  "issuedBy" UUID,
  "issuedByName" TEXT,
  "documentUrl" TEXT,
  "documentName" TEXT,
  "acknowledgedAt" TIMESTAMPTZ,
  status public.disciplinary_status NOT NULL DEFAULT 'active',
  "expiryDate" DATE,
  "followUpAction" TEXT,
  "followUpDate" DATE,
  "internalNotes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dr_company ON public.disciplinary_records ("companyId", "incidentDate" DESC);
CREATE INDEX idx_dr_employee ON public.disciplinary_records ("employeeId", "incidentDate" DESC);

ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers manage disciplinary_records"
  ON public.disciplinary_records FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "employee read own disciplinary_records"
  ON public.disciplinary_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = disciplinary_records."employeeId" AND e."userId" = auth.uid()
  ));

CREATE POLICY "employee acknowledge own disciplinary_records"
  ON public.disciplinary_records FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = disciplinary_records."employeeId" AND e."userId" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = disciplinary_records."employeeId" AND e."userId" = auth.uid()
  ));

CREATE TRIGGER trg_dr_updated_at
  BEFORE UPDATE ON public.disciplinary_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();


-- ==========================================
-- STORAGE: disciplinary documents bucket
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('disciplinary-docs', 'disciplinary-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {companyId}/{employeeId}/{filename}
-- Managers (admin/manager of that company) can read/write all in their company folder
-- Employees can read their own files

CREATE POLICY "managers read disciplinary docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'disciplinary-docs'
    AND public.is_company_manager(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "managers write disciplinary docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'disciplinary-docs'
    AND public.is_company_manager(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "managers update disciplinary docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'disciplinary-docs'
    AND public.is_company_manager(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "managers delete disciplinary docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'disciplinary-docs'
    AND public.is_company_manager(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "employee read own disciplinary docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'disciplinary-docs'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = ((storage.foldername(name))[2])::uuid
        AND e."userId" = auth.uid()
    )
  );
