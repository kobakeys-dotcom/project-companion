-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================
-- Helper: leave eligibility for an employee (2-year cycles from
-- startDate, falling back to createdAt; expires 3 months after
-- the cycle ends).
-- =============================================================
CREATE OR REPLACE FUNCTION public.leave_eligibility(_employee_id uuid)
RETURNS TABLE(
  "employeeId" uuid,
  "anchorDate" date,
  "eligibleFrom" date,
  "windowStart" date,
  "windowEnd" date,
  "expiryDate" date,
  "isEligible" boolean,
  "isExpired" boolean,
  "cycleNumber" integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anchor date;
  v_eligible_from date;
  v_today date := CURRENT_DATE;
  v_months_since int;
  v_cycle int;
  v_window_start date;
  v_window_end date;
  v_expiry date;
BEGIN
  SELECT COALESCE(e."startDate", e."createdAt"::date)
    INTO v_anchor
  FROM public.employees e
  WHERE e.id = _employee_id;

  IF v_anchor IS NULL THEN
    RETURN;
  END IF;

  v_eligible_from := v_anchor + INTERVAL '2 years';

  IF v_today < v_eligible_from THEN
    "employeeId" := _employee_id;
    "anchorDate" := v_anchor;
    "eligibleFrom" := v_eligible_from;
    "windowStart" := v_eligible_from;
    "windowEnd" := v_eligible_from + INTERVAL '2 years' - INTERVAL '1 day';
    "expiryDate" := v_eligible_from + INTERVAL '2 years 3 months' - INTERVAL '1 day';
    "isEligible" := false;
    "isExpired" := false;
    "cycleNumber" := 1;
    RETURN NEXT;
    RETURN;
  END IF;

  -- How many full 2-year cycles have elapsed since eligibility began
  v_months_since := (EXTRACT(YEAR FROM AGE(v_today, v_eligible_from)) * 12
                   + EXTRACT(MONTH FROM AGE(v_today, v_eligible_from)))::int;
  v_cycle := (v_months_since / 24) + 1;
  v_window_start := v_eligible_from + ((v_cycle - 1) * INTERVAL '2 years');
  v_window_end   := v_window_start + INTERVAL '2 years' - INTERVAL '1 day';
  v_expiry       := v_window_end + INTERVAL '3 months';

  "employeeId" := _employee_id;
  "anchorDate" := v_anchor;
  "eligibleFrom" := v_eligible_from;
  "windowStart" := v_window_start;
  "windowEnd"   := v_window_end;
  "expiryDate"  := v_expiry;
  "isEligible"  := (v_today <= v_expiry);
  "isExpired"   := (v_today > v_expiry);
  "cycleNumber" := v_cycle;
  RETURN NEXT;
END;
$$;

-- =============================================================
-- Trigger: block creating a leave request when employee is not
-- yet eligible OR the requested startDate is past the current
-- cycle's expiry.
-- =============================================================
CREATE OR REPLACE FUNCTION public.enforce_leave_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligible_from date;
  v_expiry date;
BEGIN
  SELECT "eligibleFrom", "expiryDate"
    INTO v_eligible_from, v_expiry
  FROM public.leave_eligibility(NEW."employeeId");

  IF v_eligible_from IS NULL THEN
    RAISE EXCEPTION 'Employee has no start date set; cannot request leave';
  END IF;

  IF NEW."startDate" < v_eligible_from THEN
    RAISE EXCEPTION 'Employee is not yet eligible for leave (eligible from %)', v_eligible_from;
  END IF;

  IF NEW."startDate" > v_expiry THEN
    RAISE EXCEPTION 'Leave window has expired (expiry was %)', v_expiry;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_leave_eligibility ON public.time_off_requests;
CREATE TRIGGER trg_enforce_leave_eligibility
BEFORE INSERT ON public.time_off_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_leave_eligibility();

-- =============================================================
-- Daily job: cancel expired untaken leave + reset balances when a
-- new cycle starts.
-- =============================================================
CREATE OR REPLACE FUNCTION public.expire_untaken_leave()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Cancel pending/approved untaken requests whose window expired
  UPDATE public.time_off_requests t
  SET status = 'cancelled',
      "deptApprovalStatus"  = CASE WHEN t."deptApprovalStatus"  = 'pending' THEN 'expired' ELSE t."deptApprovalStatus"  END,
      "mgmtApprovalStatus"  = CASE WHEN t."mgmtApprovalStatus"  = 'pending' THEN 'expired' ELSE t."mgmtApprovalStatus"  END,
      "adminApprovalStatus" = CASE WHEN t."adminApprovalStatus" = 'pending' THEN 'expired' ELSE t."adminApprovalStatus" END,
      "updatedAt" = now()
  FROM public.leave_eligibility(t."employeeId") le
  WHERE t."actualReturnDate" IS NULL
    AND t.status IN ('pending', 'dept_approved', 'mgmt_approved', 'approved')
    AND t."startDate" < le."windowStart";

  -- 2. Reset balances at the start of a fresh cycle (no taken leave in current window)
  UPDATE public.employees e
  SET "vacationDaysUsed" = 0,
      "sickDaysUsed" = 0,
      "updatedAt" = now()
  FROM public.leave_eligibility(e.id) le
  WHERE le."isEligible" = true
    AND le."windowStart" = CURRENT_DATE
    AND COALESCE(e."vacationDaysUsed", 0) > 0;
END;
$$;