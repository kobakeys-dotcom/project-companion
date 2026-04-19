
-- Company-wide settings (currency, timezone, fiscal year, work week, address etc.)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  "companyName" text,
  industry text,
  website text,
  address text,
  city text,
  country text,
  timezone text NOT NULL DEFAULT 'UTC',
  "fiscalYearStart" text NOT NULL DEFAULT 'January',
  "defaultCurrency" text NOT NULL DEFAULT 'USD',
  "workWeekDays" text NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read company_settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (public.is_company_member("companyId"));

CREATE POLICY "managers manage company_settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (public.is_company_manager("companyId"))
  WITH CHECK (public.is_company_manager("companyId"));

CREATE TRIGGER set_updated_at_company_settings
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_camel();
