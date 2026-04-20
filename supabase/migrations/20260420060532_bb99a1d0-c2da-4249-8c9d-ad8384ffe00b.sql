CREATE OR REPLACE FUNCTION public.get_loan_tokens(_loan_id UUID)
RETURNS TABLE(dept_token TEXT, mgmt_token TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
BEGIN
  SELECT "companyId" INTO v_company FROM public.loans WHERE id = _loan_id;
  IF v_company IS NULL THEN RETURN; END IF;
  IF NOT public.is_company_manager(v_company) THEN
    RAISE EXCEPTION 'Not authorized to view approval tokens';
  END IF;
  RETURN QUERY
  SELECT l."deptApprovalToken", l."mgmtApprovalToken"
  FROM public.loans l WHERE l.id = _loan_id;
END;
$$;