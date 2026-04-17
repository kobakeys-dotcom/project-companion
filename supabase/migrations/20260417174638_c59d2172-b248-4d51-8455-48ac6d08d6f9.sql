-- Phase 4
CREATE TABLE public.expense_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL, description text, color text NOT NULL DEFAULT '#3B82F6',
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read expense_types" ON public.expense_types FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage expense_types" ON public.expense_types FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER trg_expense_types_updated BEFORE UPDATE ON public.expense_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "expenseTypeId" uuid REFERENCES public.expense_types(id) ON DELETE SET NULL,
  amount integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  "expenseDate" date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_employee ON public.expenses ("employeeId");
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE POLICY "employee insert own expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = "employeeId" AND e."userId" = auth.uid()));
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.benefit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL, description text, color text NOT NULL DEFAULT '#10B981',
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.benefit_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read benefit_types" ON public.benefit_types FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage benefit_types" ON public.benefit_types FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER trg_benefit_types_updated BEFORE UPDATE ON public.benefit_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "benefitTypeId" uuid REFERENCES public.benefit_types(id) ON DELETE SET NULL,
  name text NOT NULL, description text, provider text, "coverageDetails" text,
  "employerContribution" integer NOT NULL DEFAULT 0,
  "employeeContribution" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read benefits" ON public.benefits FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage benefits" ON public.benefits FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER trg_benefits_updated BEFORE UPDATE ON public.benefits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

CREATE TABLE public.payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "payPeriodStart" date NOT NULL, "payPeriodEnd" date NOT NULL, month text NOT NULL,
  "baseSalary" integer NOT NULL DEFAULT 0,
  "overtimeHours" numeric NOT NULL DEFAULT 0,
  "overtimeRate" numeric NOT NULL DEFAULT 0,
  "overtimeAmount" integer NOT NULL DEFAULT 0,
  deductions integer NOT NULL DEFAULT 0, "deductionNotes" text,
  "grossSalary" integer NOT NULL DEFAULT 0, "netPay" integer NOT NULL DEFAULT 0,
  "payFrequency" text NOT NULL DEFAULT 'monthly', status text NOT NULL DEFAULT 'draft',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payroll_employee ON public.payroll_records ("employeeId");
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read payroll" ON public.payroll_records FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage payroll" ON public.payroll_records FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER trg_payroll_updated BEFORE UPDATE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

-- Phase 5
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL, "employeeId" UUID NOT NULL, "reviewerId" UUID,
  "reviewPeriodStart" DATE NOT NULL, "reviewPeriodEnd" DATE NOT NULL, "reviewDate" DATE,
  "overallRating" INTEGER, "productivityRating" INTEGER, "qualityRating" INTEGER,
  "teamworkRating" INTEGER, "communicationRating" INTEGER,
  strengths TEXT, improvements TEXT, goals TEXT, comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read performance_reviews" ON public.performance_reviews FOR SELECT TO authenticated
  USING (public.is_company_member("companyId") OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = performance_reviews."employeeId" AND e."userId" = auth.uid()));
CREATE POLICY "managers manage performance_reviews" ON public.performance_reviews FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE POLICY "employee acknowledge own review" ON public.performance_reviews FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = performance_reviews."employeeId" AND e."userId" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = performance_reviews."employeeId" AND e."userId" = auth.uid()));
CREATE TRIGGER set_performance_reviews_updated_at BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE INDEX idx_performance_reviews_company ON public.performance_reviews("companyId");
CREATE INDEX idx_performance_reviews_employee ON public.performance_reviews("employeeId");

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL, title TEXT NOT NULL, "departmentId" UUID,
  "employmentType" public.employment_type NOT NULL DEFAULT 'full_time',
  location TEXT, description TEXT, requirements TEXT,
  "salaryMin" INTEGER, "salaryMax" INTEGER, status TEXT NOT NULL DEFAULT 'open',
  "postedDate" DATE DEFAULT CURRENT_DATE, "closingDate" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read jobs" ON public.jobs FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage jobs" ON public.jobs FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER set_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE INDEX idx_jobs_company ON public.jobs("companyId");

CREATE TABLE public.job_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL, "jobId" UUID,
  "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL,
  email TEXT NOT NULL, phone TEXT, "resumeUrl" TEXT, "coverLetter" TEXT,
  stage TEXT NOT NULL DEFAULT 'applied', notes TEXT, rating INTEGER,
  "appliedDate" DATE DEFAULT CURRENT_DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read job_candidates" ON public.job_candidates FOR SELECT TO authenticated USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage job_candidates" ON public.job_candidates FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE TRIGGER set_job_candidates_updated_at BEFORE UPDATE ON public.job_candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE INDEX idx_job_candidates_company ON public.job_candidates("companyId");
CREATE INDEX idx_job_candidates_job ON public.job_candidates("jobId");

-- Receipts bucket
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "receiptUrl" text;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts: company members read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND public.is_company_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "receipts: employees upload to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND public.is_company_member(((storage.foldername(name))[1])::uuid) AND owner = auth.uid());
CREATE POLICY "receipts: owner or manager delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND (owner = auth.uid() OR public.is_company_manager(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "receipts: owner or manager update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND (owner = auth.uid() OR public.is_company_manager(((storage.foldername(name))[1])::uuid)));

-- benefit_enrollments
CREATE TABLE public.benefit_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL, "employeeId" UUID NOT NULL, "benefitId" UUID NOT NULL,
  "enrolledAt" DATE NOT NULL DEFAULT CURRENT_DATE, "endedAt" DATE,
  status TEXT NOT NULL DEFAULT 'active', notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("employeeId", "benefitId")
);
CREATE INDEX idx_benefit_enrollments_employee ON public.benefit_enrollments ("employeeId");
ALTER TABLE public.benefit_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers manage benefit_enrollments" ON public.benefit_enrollments FOR ALL TO authenticated USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE POLICY "members read benefit_enrollments" ON public.benefit_enrollments FOR SELECT TO authenticated
  USING (public.is_company_member("companyId") OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = benefit_enrollments."employeeId" AND e."userId" = auth.uid()));
CREATE TRIGGER set_updated_at_benefit_enrollments BEFORE UPDATE ON public.benefit_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL, "companyId" UUID,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, link TEXT,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications ("userId", "createdAt" DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING ("userId" = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ("userId" = auth.uid()) WITH CHECK ("userId" = auth.uid());
CREATE POLICY "managers insert company notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK ("companyId" IS NOT NULL AND public.is_company_manager("companyId"));

CREATE OR REPLACE FUNCTION public.notify_employee_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user UUID; v_company UUID; v_title TEXT; v_body TEXT; v_link TEXT;
BEGIN
  SELECT "userId", "companyId" INTO v_user, v_company FROM public.employees WHERE id = NEW."employeeId";
  IF v_user IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'expenses' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_title := 'Expense ' || NEW.status; v_body := NEW.description; v_link := '/employee/portal';
    ELSE RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME = 'time_off_requests' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_title := 'Time-off ' || NEW.status; v_body := 'Your request ' || NEW."startDate"::text || ' – ' || NEW."endDate"::text; v_link := '/employee/portal';
    ELSE RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME = 'performance_reviews' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'submitted' THEN
      v_title := 'New performance review'; v_body := 'A review has been submitted for your acknowledgement.'; v_link := '/employee/portal';
    ELSE RETURN NEW; END IF;
  ELSE RETURN NEW; END IF;
  INSERT INTO public.notifications ("userId", "companyId", type, title, body, link)
  VALUES (v_user, v_company, TG_TABLE_NAME, v_title, v_body, v_link);
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_expense_status AFTER UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.notify_employee_on_status_change();
CREATE TRIGGER notify_time_off_status AFTER UPDATE ON public.time_off_requests FOR EACH ROW EXECUTE FUNCTION public.notify_employee_on_status_change();
CREATE TRIGGER notify_review_status AFTER UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.notify_employee_on_status_change();

-- Public jobs/candidates
CREATE POLICY "public read open jobs" ON public.jobs FOR SELECT TO anon USING (status = 'open');
CREATE POLICY "public insert candidates" ON public.job_candidates FOR INSERT TO anon
  WITH CHECK ("firstName" IS NOT NULL AND length(trim("firstName")) > 0
    AND "lastName" IS NOT NULL AND length(trim("lastName")) > 0
    AND email IS NOT NULL AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND stage = 'applied' AND rating IS NULL);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;