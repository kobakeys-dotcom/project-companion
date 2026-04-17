-- =========================================
-- 1. Roles enum + user_roles table
-- =========================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'employee');

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  employee_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_first TEXT;
  v_last TEXT;
BEGIN
  v_first := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last  := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, v_first, v_last);

  v_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.app_role,
    'employee'::public.app_role
  );

  IF v_role = 'super_admin' THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their company"
  ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can create companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE TO authenticated
  USING ((id = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'admin')) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Creators can view their created companies"
  ON public.companies FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users view profiles in their company"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR (public.has_role(auth.uid(), 'admin') AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR (public.has_role(auth.uid(), 'admin') AND company_id = public.get_user_company(auth.uid())));

CREATE POLICY "Super admins manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage non-super roles in their company"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND company_id = public.get_user_company(auth.uid()) AND role <> 'super_admin');

CREATE POLICY "Admins delete non-super roles in their company"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND company_id = public.get_user_company(auth.uid()) AND role <> 'super_admin');

CREATE POLICY "Users can attach company to own role"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND role <> 'super_admin')
  WITH CHECK (user_id = auth.uid() AND role <> 'super_admin' AND company_id = public.get_user_company(auth.uid()));