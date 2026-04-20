-- Enums
CREATE TYPE public.loan_status AS ENUM ('pending', 'dept_approved', 'mgmt_approved', 'approved', 'rejected', 'cancelled', 'completed');
CREATE TYPE public.loan_repayment_status AS ENUM ('scheduled', 'paid', 'skipped');

-- Loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  "recoveryMonths" INTEGER NOT NULL CHECK ("recoveryMonths" > 0 AND "recoveryMonths" <= 120),
  reason TEXT,
  "startMonth" TEXT, -- 'YYYY-MM' set by admin on approval
  status public.loan_status NOT NULL DEFAULT 'pending',
  "deptApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
  "mgmtApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
  "adminApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
  "deptApprovalToken" TEXT DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  "mgmtApprovalToken" TEXT DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  "approvedBy" UUID,
  "approvedAt" TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_company ON public.loans("companyId");
CREATE INDEX idx_loans_employee ON public.loans("employeeId");
CREATE INDEX idx_loans_status ON public.loans(status);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee insert own loans" ON public.loans
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()));

CREATE POLICY "employee read own loans" ON public.loans
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()));

CREATE POLICY "managers manage loans" ON public.loans
FOR ALL TO authenticated
USING (public.is_company_manager("companyId"))
WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "managers read loans" ON public.loans
FOR SELECT TO authenticated
USING (public.is_company_manager("companyId"));

CREATE TRIGGER trg_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

-- Loan repayments table (one row per scheduled month)
CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "loanId" UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  "employeeId" UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "installmentNumber" INTEGER NOT NULL,
  month TEXT NOT NULL, -- 'YYYY-MM'
  amount NUMERIC NOT NULL DEFAULT 0,
  status public.loan_repayment_status NOT NULL DEFAULT 'scheduled',
  "paidInPayrollId" UUID,
  "paidAt" TIMESTAMPTZ,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("loanId", "installmentNumber")
);

CREATE INDEX idx_loan_repay_loan ON public.loan_repayments("loanId");
CREATE INDEX idx_loan_repay_employee_month ON public.loan_repayments("employeeId", month);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee read own loan_repayments" ON public.loan_repayments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()));

CREATE POLICY "managers manage loan_repayments" ON public.loan_repayments
FOR ALL TO authenticated
USING (public.is_company_manager("companyId"))
WITH CHECK (public.is_company_manager("companyId"));

CREATE TRIGGER trg_loan_repay_updated_at
BEFORE UPDATE ON public.loan_repayments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

-- Function to (re)generate repayment schedule for an approved loan
CREATE OR REPLACE FUNCTION public.generate_loan_schedule(_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_base NUMERIC;
  v_remainder NUMERIC;
  v_per_month NUMERIC;
  v_year INT;
  v_month INT;
  i INT;
  v_amt NUMERIC;
  v_month_str TEXT;
BEGIN
  SELECT * INTO v_loan FROM public.loans WHERE id = _loan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan."startMonth" IS NULL THEN RAISE EXCEPTION 'Loan startMonth is required'; END IF;

  -- Wipe existing unpaid scheduled rows; preserve any already paid
  DELETE FROM public.loan_repayments
   WHERE "loanId" = _loan_id AND status <> 'paid';

  -- Equal split, last installment carries any rounding remainder (2 decimals)
  v_per_month := round(v_loan.amount / v_loan."recoveryMonths", 2);
  v_remainder := v_loan.amount - (v_per_month * v_loan."recoveryMonths");

  v_year := split_part(v_loan."startMonth", '-', 1)::INT;
  v_month := split_part(v_loan."startMonth", '-', 2)::INT;

  FOR i IN 1..v_loan."recoveryMonths" LOOP
    v_amt := v_per_month;
    IF i = v_loan."recoveryMonths" THEN
      v_amt := v_amt + v_remainder;
    END IF;
    v_month_str := lpad(v_year::TEXT, 4, '0') || '-' || lpad(v_month::TEXT, 2, '0');

    INSERT INTO public.loan_repayments
      ("companyId", "loanId", "employeeId", "installmentNumber", month, amount, status)
    VALUES
      (v_loan."companyId", _loan_id, v_loan."employeeId", i, v_month_str, v_amt, 'scheduled')
    ON CONFLICT ("loanId", "installmentNumber") DO NOTHING;

    -- advance month
    v_month := v_month + 1;
    IF v_month > 12 THEN
      v_month := 1;
      v_year := v_year + 1;
    END IF;
  END LOOP;
END;
$$;

-- Trigger: when a loan transitions to status='approved' and has a startMonth, build schedule
CREATE OR REPLACE FUNCTION public.loans_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW."startMonth" IS NOT NULL
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD."startMonth" IS DISTINCT FROM NEW."startMonth") THEN
    PERFORM public.generate_loan_schedule(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loans_on_approval
AFTER UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.loans_on_approval();

-- Notify employee on loan status change (reuses notifications table)
CREATE OR REPLACE FUNCTION public.notify_employee_on_loan_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID; v_company UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT "userId", "companyId" INTO v_user, v_company FROM public.employees WHERE id = NEW."employeeId";
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notifications ("userId", "companyId", type, title, body, link)
      VALUES (v_user, v_company, 'loan', 'Loan ' || NEW.status,
              'Loan amount ' || NEW.amount::text || ' ' || NEW.currency, '/employee/portal');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loans_notify
AFTER UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.notify_employee_on_loan_status_change();