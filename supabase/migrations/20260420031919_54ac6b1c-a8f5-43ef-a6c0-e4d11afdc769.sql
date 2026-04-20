ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS "enforceEligibility" boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.enforce_leave_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eligible_from date;
  v_expiry date;
  v_enforce boolean := true;
BEGIN
  IF NEW."leaveTypeId" IS NOT NULL THEN
    SELECT "enforceEligibility" INTO v_enforce
      FROM public.leave_types WHERE id = NEW."leaveTypeId";
    v_enforce := COALESCE(v_enforce, true);
  END IF;

  IF NOT v_enforce THEN
    RETURN NEW;
  END IF;

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
$function$;