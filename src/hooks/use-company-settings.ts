/**
 * Hook for reading the current user's company settings (currency, timezone,
 * fiscal year, work week, company info). Backed by `public.company_settings`
 * via Lovable Cloud. Auto-creates a default row the first time it's read.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  companyId: string;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  fiscalYearStart: string;
  defaultCurrency: string;
  workWeekDays: string;
}

const sb: any = supabase;

export const COMPANY_SETTINGS_QUERY_KEY = ["company-settings"] as const;

async function fetchCompanySettings(): Promise<CompanySettings | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: prof } = await sb
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const companyId = prof?.company_id as string | undefined;
  if (!companyId) return null;

  const { data: existing, error } = await sb
    .from("company_settings")
    .select("*")
    .eq("companyId", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (existing) return existing as CompanySettings;

  // First-time read: create a default row scoped to this company.
  const { data: company } = await sb
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  const { data: created, error: insertErr } = await sb
    .from("company_settings")
    .insert({ companyId, companyName: company?.name ?? null })
    .select()
    .single();
  if (insertErr) {
    // Race: another tab/user inserted first — re-read
    const { data: again } = await sb
      .from("company_settings")
      .select("*")
      .eq("companyId", companyId)
      .maybeSingle();
    return (again as CompanySettings) ?? null;
  }
  return created as CompanySettings;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: COMPANY_SETTINGS_QUERY_KEY,
    queryFn: fetchCompanySettings,
    staleTime: 60_000,
  });
}

/**
 * Format an amount in the company's default currency.
 *
 * @param amount  Whole-currency-unit amount (e.g. 5000 → "$5,000")
 * @param currencyCode  Override currency; falls back to USD
 */
export function formatMoney(
  amount: number,
  currencyCode: string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  const code = (currencyCode || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
      ...options,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}

/**
 * Format a "cents" amount (integer minor units) in the company's currency.
 */
export function formatMoneyCents(
  cents: number,
  currencyCode: string | null | undefined,
): string {
  return formatMoney((cents ?? 0) / 100, currencyCode, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
