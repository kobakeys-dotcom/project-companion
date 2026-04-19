-- ============================================================
-- 1. Archive function: delete records older than N years
-- ============================================================
CREATE OR REPLACE FUNCTION public.archive_old_records(retention_years integer DEFAULT 2)
RETURNS TABLE(table_name text, deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - (retention_years || ' years')::interval;
  v_count bigint;
BEGIN
  -- Only super admins can archive
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can archive old records';
  END IF;

  -- Time entries (attendance)
  DELETE FROM public.time_entries WHERE "createdAt" < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'time_entries'; deleted_count := v_count; RETURN NEXT;

  -- Payroll records
  DELETE FROM public.payroll_records WHERE "createdAt" < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'payroll_records'; deleted_count := v_count; RETURN NEXT;

  -- Resolved time-off requests
  DELETE FROM public.time_off_requests
    WHERE "createdAt" < v_cutoff
      AND status IN ('approved', 'rejected', 'cancelled');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'time_off_requests'; deleted_count := v_count; RETURN NEXT;

  -- Old read notifications (90 days)
  DELETE FROM public.notifications
    WHERE "createdAt" < (now() - INTERVAL '90 days')
      AND "readAt" IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'notifications'; deleted_count := v_count; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_old_records(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_old_records(integer) TO authenticated;

-- ============================================================
-- 2. Missing indexes on hot query columns
-- ============================================================

-- time_entries: company-wide listings ordered by date
CREATE INDEX IF NOT EXISTS idx_time_entries_company_date
  ON public.time_entries ("companyId", date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_open
  ON public.time_entries ("employeeId", "clockIn" DESC)
  WHERE "clockOut" IS NULL;

-- time_off_requests
CREATE INDEX IF NOT EXISTS idx_time_off_company_status
  ON public.time_off_requests ("companyId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_time_off_employee
  ON public.time_off_requests ("employeeId", "startDate" DESC);

-- payroll_records: monthly company queries
CREATE INDEX IF NOT EXISTS idx_payroll_company_month
  ON public.payroll_records ("companyId", month DESC);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_company_date
  ON public.expenses ("companyId", "expenseDate" DESC);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_company
  ON public.documents ("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_documents_employee
  ON public.documents ("employeeId")
  WHERE "employeeId" IS NOT NULL;

-- notifications: unread per user (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

-- deductions
CREATE INDEX IF NOT EXISTS idx_deductions_company
  ON public.deductions ("companyId", "incidentDate" DESC);
CREATE INDEX IF NOT EXISTS idx_deductions_employee
  ON public.deductions ("employeeId", "incidentDate" DESC);

-- benefit_enrollments
CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_employee
  ON public.benefit_enrollments ("employeeId");

-- user_roles: role checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id, role);

-- profiles: company lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company
  ON public.profiles (company_id) WHERE company_id IS NOT NULL;