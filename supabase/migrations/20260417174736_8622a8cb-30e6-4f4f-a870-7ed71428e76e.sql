-- 1. EMPLOYEES: hide sensitive cols
DROP POLICY IF EXISTS "members read employees" ON public.employees;
CREATE POLICY "managers read employees" ON public.employees FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "employee read own" ON public.employees FOR SELECT TO authenticated USING ("userId" = auth.uid());

CREATE OR REPLACE FUNCTION public.list_employees_directory()
RETURNS TABLE (
  id uuid, "companyId" uuid, "userId" uuid,
  "firstName" text, "lastName" text, email text, phone text,
  "jobTitle" text, "departmentId" uuid, "projectId" uuid,
  "accommodationId" uuid, "roomId" uuid, "profileImageUrl" text,
  location text, nationality text,
  "employmentType" public.employment_type,
  "employmentStatus" public.employment_status,
  "startDate" date, bio text,
  "createdAt" timestamptz, "updatedAt" timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e."companyId", e."userId", e."firstName", e."lastName",
    e.email, e.phone, e."jobTitle", e."departmentId", e."projectId",
    e."accommodationId", e."roomId", e."profileImageUrl", e.location,
    e.nationality, e."employmentType", e."employmentStatus",
    e."startDate", e.bio, e."createdAt", e."updatedAt"
  FROM public.employees e
  WHERE public.is_company_member(e."companyId");
$$;
GRANT EXECUTE ON FUNCTION public.list_employees_directory() TO authenticated;

-- 2. PAYROLL
DROP POLICY IF EXISTS "members read payroll" ON public.payroll_records;
CREATE POLICY "managers read payroll" ON public.payroll_records FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "employee read own payroll" ON public.payroll_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = payroll_records."employeeId" AND e."userId" = auth.uid()));

-- 3. EXPENSES
DROP POLICY IF EXISTS "members read expenses" ON public.expenses;
CREATE POLICY "managers read expenses" ON public.expenses FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "employee read own expenses" ON public.expenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = expenses."employeeId" AND e."userId" = auth.uid()));

-- 4. PERFORMANCE REVIEWS
DROP POLICY IF EXISTS "members read performance_reviews" ON public.performance_reviews;
CREATE POLICY "managers read performance_reviews" ON public.performance_reviews FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "employee read own performance_reviews" ON public.performance_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = performance_reviews."employeeId" AND e."userId" = auth.uid()));

-- 5. JOB CANDIDATES (managers only)
DROP POLICY IF EXISTS "members read job_candidates" ON public.job_candidates;

-- 6. TIME-OFF
DROP POLICY IF EXISTS "members read time_off" ON public.time_off_requests;
CREATE POLICY "managers read time_off" ON public.time_off_requests FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "employee read own time_off" ON public.time_off_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_off_requests."employeeId" AND e."userId" = auth.uid()));

-- 7. user_roles privilege escalation fix
DROP POLICY IF EXISTS "Users can attach company to own role" ON public.user_roles;

-- 9. BENEFIT ENROLLMENTS
DROP POLICY IF EXISTS "members read benefit_enrollments" ON public.benefit_enrollments;
CREATE POLICY "managers read benefit_enrollments" ON public.benefit_enrollments FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "employee read own benefit_enrollments" ON public.benefit_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = benefit_enrollments."employeeId" AND e."userId" = auth.uid()));

-- 10. DOCUMENTS
DROP POLICY IF EXISTS "members read documents" ON public.documents;
CREATE POLICY "managers read documents" ON public.documents FOR SELECT TO authenticated USING (is_company_manager("companyId"));
CREATE POLICY "members read company-wide documents" ON public.documents FOR SELECT TO authenticated
  USING (is_company_member("companyId") AND "isCompanyWide" = true);
CREATE POLICY "employee read own documents" ON public.documents FOR SELECT TO authenticated
  USING ("employeeId" IS NOT NULL AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = documents."employeeId" AND e."userId" = auth.uid()));

-- 11. TIME ENTRIES
DROP POLICY IF EXISTS "members read time_entries" ON public.time_entries;
CREATE POLICY "managers read time_entries" ON public.time_entries FOR SELECT TO authenticated USING (is_company_manager("companyId"));

-- ROUND 2: Time-off tokens hide
CREATE OR REPLACE VIEW public.time_off_requests_safe
WITH (security_invoker = on) AS
SELECT id, "companyId", "employeeId", "leaveTypeId", type,
  "startDate", "endDate", "actualReturnDate", reason, status,
  "deptApprovalStatus", "mgmtApprovalStatus", "adminApprovalStatus",
  "createdAt", "updatedAt"
FROM public.time_off_requests;
GRANT SELECT ON public.time_off_requests_safe TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_time_off_requests()
RETURNS SETOF public.time_off_requests_safe
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t."companyId", t."employeeId", t."leaveTypeId", t.type,
    t."startDate", t."endDate", t."actualReturnDate", t.reason, t.status,
    t."deptApprovalStatus", t."mgmtApprovalStatus", t."adminApprovalStatus",
    t."createdAt", t."updatedAt"
  FROM public.time_off_requests t
  JOIN public.employees e ON e.id = t."employeeId"
  WHERE e."userId" = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.list_my_time_off_requests() TO authenticated;

-- Receipts: owner/manager only
DROP POLICY IF EXISTS "receipts: company members read" ON storage.objects;
CREATE POLICY "receipts: owner or manager read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR ((storage.foldername(name))[1] IS NOT NULL AND public.is_company_manager(((storage.foldername(name))[1])::uuid))
    )
  );

-- Employee self-update restricted to safe columns
DROP POLICY IF EXISTS "employee can update own" ON public.employees;
REVOKE UPDATE ON public.employees FROM authenticated;
GRANT UPDATE (
  bio, "profileImageUrl", phone,
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
  "uniformSize", "safetyShoeSize"
) ON public.employees TO authenticated;
CREATE POLICY "employee update own safe fields" ON public.employees FOR UPDATE TO authenticated
  USING ("userId" = auth.uid()) WITH CHECK ("userId" = auth.uid());
GRANT UPDATE (
  "firstName", "lastName", email, "jobTitle", "departmentId", "projectId",
  "accommodationId", "roomId", location, nationality, "employmentType",
  "employmentStatus", "startDate", salary, "basicSalary", "foodAllowance",
  "accommodationAllowance", "otherAllowance", "passportNumber",
  "passportExpiryDate", "visaNumber", "visaExpiryDate", "workPermitNumber",
  "workPermitExpiryDate", "insuranceExpiryDate", "medicalExpiryDate",
  "quotaExpiryDate", "bankName1", "accountNumber1", "currency1",
  "bankName2", "accountNumber2", "currency2", "vacationDaysTotal",
  "vacationDaysUsed", "sickDaysTotal", "sickDaysUsed",
  "uniformIssuedDate", "safetyShoeIssuedDate", "userId", "companyId"
) ON public.employees TO authenticated;

-- Realtime channel
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'realtime' AND c.relname = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "users subscribe to own channel" ON realtime.messages';
    EXECUTE $POLICY$
      CREATE POLICY "users subscribe to own channel"
        ON realtime.messages FOR SELECT TO authenticated
        USING (realtime.topic() = ('user:' || auth.uid()::text))
    $POLICY$;
  END IF;
END $$;