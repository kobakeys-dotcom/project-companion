/**
 * Query/mutation router for the HR pages. Wires the legacy `/api/...` endpoints
 * (queryKeys + apiRequest calls) to the real Lovable Cloud backend through
 * src/lib/hr-api.ts. Endpoints not yet ported still resolve to []/null.
 */
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { hrFetch, hrMutate } from "@/lib/hr-api";

export function parseErrorMessage(error: Error): string {
  return error?.message ?? "Unknown error";
}

// Endpoints handled by the real backend (Phase 2+). Add more as we port pages.
const SUPPORTED_PATH_PREFIXES = [
  "/api/employees",
  "/api/departments",
  "/api/projects",
  "/api/accommodations",
  "/api/accommodation-rooms",
  "/api/leave-types",
  "/api/time-off",
  "/api/attendance",
  "/api/documents",
  "/api/expense-types",
  "/api/expenses",
  "/api/benefit-types",
  "/api/benefits",
  "/api/payroll",
  "/api/performance-reviews",
  "/api/jobs",
  "/api/job-candidates",
  "/api/settings",
];

function isSupported(path: string) {
  return SUPPORTED_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body ?? null), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  if (isSupported(url)) {
    try {
      const result = await hrMutate(
        method.toUpperCase() as "POST" | "PATCH" | "PUT" | "DELETE",
        url,
        data,
      );
      return jsonResponse(result, 200);
    } catch (e) {
      throw new Error((e as Error).message);
    }
  }
  // Unported endpoints — silent success
  return jsonResponse([]);
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Legacy heuristics for endpoints we haven't ported yet.
const COLLECTION_HINTS = [
  "documents", "payroll", "expenses", "benefits", "attendance", "time-off",
  "timeOff", "performance", "recruitment", "candidates", "leaves", "users",
  "gears", "personal-gears", "bank-details", "onboarding", "reports",
  "notifications", "subscriptions", "companies", "audit",
];

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> = () => async ({ queryKey }) => {
  const segments = queryKey as unknown[];
  const path = String(segments[0] ?? "");

  if (isSupported(path)) {
    const result = await hrFetch(path, segments);
    return result as never;
  }

  const url = segments.join("/");
  const isCollection = COLLECTION_HINTS.some((h) => url.includes(h));
  return (isCollection ? [] : null) as never;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
