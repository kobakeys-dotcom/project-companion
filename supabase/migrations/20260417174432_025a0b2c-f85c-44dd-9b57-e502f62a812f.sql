CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND company_id = _company_id
  ) OR public.has_role(auth.uid(), 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_company_manager(_company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND company_id = _company_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  ) OR public.has_role(auth.uid(), 'super_admin');
$$;

CREATE TYPE public.employment_type AS ENUM ('full_time', 'part_time', 'contractor', 'intern');
CREATE TYPE public.employment_status AS ENUM ('active', 'on_leave', 'terminated');
CREATE TYPE public.project_type AS ENUM ('project', 'branch', 'site');

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_departments_company ON public.departments("companyId");

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f59e0b',
  type public.project_type NOT NULL DEFAULT 'project',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_company ON public.projects("companyId");

CREATE TABLE public.accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  capacity INTEGER,
  "numberOfRooms" INTEGER,
  color TEXT DEFAULT '#10b981',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accommodations_company ON public.accommodations("companyId");

CREATE TABLE public.accommodation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "accommodationId" UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_accommodation_rooms_acc ON public.accommodation_rooms("accommodationId");

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "userId" UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  "profileImageUrl" TEXT,
  bio TEXT,
  location TEXT,
  nationality TEXT,
  "jobTitle" TEXT NOT NULL,
  "departmentId" UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  "projectId" UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  "accommodationId" UUID REFERENCES public.accommodations(id) ON DELETE SET NULL,
  "roomId" UUID REFERENCES public.accommodation_rooms(id) ON DELETE SET NULL,
  "employmentType" public.employment_type NOT NULL DEFAULT 'full_time',
  "employmentStatus" public.employment_status NOT NULL DEFAULT 'active',
  "startDate" DATE,
  salary NUMERIC,
  "basicSalary" NUMERIC,
  "foodAllowance" NUMERIC,
  "accommodationAllowance" NUMERIC,
  "otherAllowance" NUMERIC,
  "passportNumber" TEXT,
  "passportExpiryDate" DATE,
  "visaNumber" TEXT,
  "visaExpiryDate" DATE,
  "workPermitNumber" TEXT,
  "workPermitExpiryDate" DATE,
  "insuranceExpiryDate" DATE,
  "medicalExpiryDate" DATE,
  "quotaExpiryDate" DATE,
  "bankName1" TEXT, "accountNumber1" TEXT, "currency1" TEXT,
  "bankName2" TEXT, "accountNumber2" TEXT, "currency2" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "emergencyContactRelation" TEXT,
  "uniformSize" TEXT,
  "uniformIssuedDate" DATE,
  "safetyShoeSize" TEXT,
  "safetyShoeIssuedDate" DATE,
  "vacationDaysTotal" INTEGER DEFAULT 20,
  "vacationDaysUsed" INTEGER DEFAULT 0,
  "sickDaysTotal" INTEGER DEFAULT 10,
  "sickDaysUsed" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_employees_company ON public.employees("companyId");
CREATE INDEX idx_employees_user ON public.employees("userId");
CREATE INDEX idx_employees_department ON public.employees("departmentId");
CREATE UNIQUE INDEX uniq_employees_company_email ON public.employees("companyId", lower(email));

CREATE OR REPLACE FUNCTION public.set_updated_at_camel()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE TRIGGER trg_accommodations_updated BEFORE UPDATE ON public.accommodations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE TRIGGER trg_accommodation_rooms_updated BEFORE UPDATE ON public.accommodation_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read departments" ON public.departments FOR SELECT TO authenticated
  USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage departments" ON public.departments FOR ALL TO authenticated
  USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "members read projects" ON public.projects FOR SELECT TO authenticated
  USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage projects" ON public.projects FOR ALL TO authenticated
  USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "members read accommodations" ON public.accommodations FOR SELECT TO authenticated
  USING (public.is_company_member("companyId"));
CREATE POLICY "managers manage accommodations" ON public.accommodations FOR ALL TO authenticated
  USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));

CREATE POLICY "members read rooms" ON public.accommodation_rooms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accommodations a WHERE a.id = "accommodationId" AND public.is_company_member(a."companyId")));
CREATE POLICY "managers manage rooms" ON public.accommodation_rooms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accommodations a WHERE a.id = "accommodationId" AND public.is_company_manager(a."companyId")))
  WITH CHECK (EXISTS (SELECT 1 FROM public.accommodations a WHERE a.id = "accommodationId" AND public.is_company_manager(a."companyId")));

CREATE POLICY "members read employees" ON public.employees FOR SELECT TO authenticated
  USING (public.is_company_member("companyId") OR "userId" = auth.uid());
CREATE POLICY "managers manage employees" ON public.employees FOR ALL TO authenticated
  USING (public.is_company_manager("companyId")) WITH CHECK (public.is_company_manager("companyId"));
CREATE POLICY "employee can update own" ON public.employees FOR UPDATE TO authenticated
  USING ("userId" = auth.uid()) WITH CHECK ("userId" = auth.uid());