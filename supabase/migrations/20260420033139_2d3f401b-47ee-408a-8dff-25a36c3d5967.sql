CREATE OR REPLACE FUNCTION public.leave_eligibility(_employee_id uuid)
 RETURNS TABLE("employeeId" uuid, "anchorDate" date, "eligibleFrom" date, "windowStart" date, "windowEnd" date, "expiryDate" date, "isEligible" boolean, "isExpired" boolean, "cycleNumber" integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    "windowEnd" := v_eligible_from + INTERVAL '3 months' - INTERVAL '1 day';
    "expiryDate" := v_eligible_from + INTERVAL '3 months' - INTERVAL '1 day';
    "isEligible" := false;
    "isExpired" := false;
    "cycleNumber" := 1;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Cycle repeats every 2 years; each cycle has a 3-month leave window from the eligibility date
  v_months_since := (EXTRACT(YEAR FROM AGE(v_today, v_eligible_from)) * 12
                   + EXTRACT(MONTH FROM AGE(v_today, v_eligible_from)))::int;
  v_cycle := (v_months_since / 24) + 1;
  v_window_start := v_eligible_from + ((v_cycle - 1) * INTERVAL '2 years');
  v_window_end   := v_window_start + INTERVAL '3 months' - INTERVAL '1 day';
  v_expiry       := v_window_end;

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
$function$;