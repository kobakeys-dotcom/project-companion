CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  "daysAllowed" integer NOT NULL DEFAULT 0,
  color text DEFAULT '#6366f1',
  "requiresDeptApproval" boolean NOT NULL DEFAULT true,
  "requiresMgmtApproval" boolean NOT NULL DEFAULT true,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read leave_types" ON public.leave_types
  FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage leave_types" ON public.leave_types
  FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER trg_leave_types_updated BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "leaveTypeId" uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  type text,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "actualReturnDate" date,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  "deptApprovalStatus" text NOT NULL DEFAULT 'pending',
  "mgmtApprovalStatus" text NOT NULL DEFAULT 'pending',
  "adminApprovalStatus" text NOT NULL DEFAULT 'pending',
  "deptApprovalToken" text DEFAULT encode(gen_random_bytes(16), 'hex'),
  "mgmtApprovalToken" text DEFAULT encode(gen_random_bytes(16), 'hex'),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read time_off" ON public.time_off_requests
  FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage time_off" ON public.time_off_requests
  FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));
CREATE POLICY "employee insert own time_off" ON public.time_off_requests
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()));
CREATE TRIGGER trg_time_off_updated BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  "clockIn" timestamptz NOT NULL DEFAULT now(),
  "clockOut" timestamptz,
  "breakMinutes" integer NOT NULL DEFAULT 0,
  "clockInLatitude" numeric,
  "clockInLongitude" numeric,
  "clockInLocation" text,
  "clockOutLatitude" numeric,
  "clockOutLongitude" numeric,
  "clockOutLocation" text,
  notes text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_time_entries_employee_date ON public.time_entries ("employeeId", date);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read time_entries" ON public.time_entries
  FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage time_entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));
CREATE POLICY "employee manage own time_entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()));
CREATE TRIGGER trg_time_entries_updated BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  "fileUrl" text,
  "fileSize" integer,
  "isCompanyWide" boolean NOT NULL DEFAULT false,
  "uploadedBy" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_company_member("companyId")
    OR ("employeeId" IS NOT NULL AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()))
  );
CREATE POLICY "managers manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "company members read documents storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_company_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "managers upload documents storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));
CREATE POLICY "managers update documents storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));
CREATE POLICY "managers delete documents storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_company_manager(((storage.foldername(name))[1])::uuid));