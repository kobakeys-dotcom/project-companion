CREATE OR REPLACE FUNCTION public.get_time_off_tokens(_request_id uuid)
 RETURNS TABLE(dept_token text, mgmt_token text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
BEGIN
  SELECT "companyId" INTO v_company
  FROM public.time_off_requests
  WHERE id = _request_id;

  IF v_company IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.is_company_manager(v_company) THEN
    RAISE EXCEPTION 'Not authorized to view approval tokens';
  END IF;

  RETURN QUERY
  SELECT t."deptApprovalToken", t."mgmtApprovalToken"
  FROM public.time_off_requests t
  WHERE t.id = _request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_time_off_tokens(uuid) TO authenticated;