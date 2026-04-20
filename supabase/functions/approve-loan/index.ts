// Public token-based loan approval endpoint (no auth required)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const url = new URL(req.url);
  // Path: /approve-loan/<type>/<id>
  const parts = url.pathname.split("/").filter(Boolean);
  const type = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  const token = url.searchParams.get("token") || "";

  if (type !== "dept" && type !== "mgmt") return json({ message: "Invalid approval type" }, 400);
  if (!id || !token) return json({ message: "Missing id or token" }, 400);

  const statusColumn = type === "dept" ? "deptApprovalStatus" : "mgmtApprovalStatus";

  const { data: reqRow, error: reqErr } = await supabase
    .from("loans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (reqErr || !reqRow) return json({ message: "Loan not found" }, 404);

  const expected = type === "dept" ? reqRow.deptApprovalToken : reqRow.mgmtApprovalToken;
  if (!expected || expected !== token) {
    return json({ message: "Invalid or expired token" }, 403);
  }

  const { data: emp } = await supabase
    .from("employees")
    .select("firstName,lastName,email,departmentId")
    .eq("id", reqRow.employeeId)
    .maybeSingle();

  let departmentName: string | null = null;
  if (emp?.departmentId) {
    const { data: dept } = await supabase.from("departments").select("name").eq("id", emp.departmentId).maybeSingle();
    departmentName = dept?.name ?? null;
  }

  // Always show the company's current default currency, not whatever was stored at request time
  const { data: settings } = await supabase
    .from("company_settings")
    .select("defaultCurrency")
    .eq("companyId", reqRow.companyId)
    .maybeSingle();
  const displayCurrency = settings?.defaultCurrency || reqRow.currency || "USD";

  const details = {
    id: reqRow.id,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
    employeeEmail: emp?.email ?? "",
    departmentName,
    amount: Number(reqRow.amount),
    currency: displayCurrency,
    recoveryMonths: reqRow.recoveryMonths,
    reason: reqRow.reason,
    status: reqRow.status,
    deptApprovalStatus: reqRow.deptApprovalStatus,
    mgmtApprovalStatus: reqRow.mgmtApprovalStatus,
    adminApprovalStatus: reqRow.adminApprovalStatus,
    createdAt: reqRow.createdAt,
  };

  if (req.method === "GET") return json(details);

  if (req.method === "POST") {
    let body: { action?: string; notes?: string } = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const action = body.action;
    if (action !== "approve" && action !== "reject") return json({ message: "Invalid action" }, 400);

    if (reqRow.status === "rejected") return json({ message: "Loan already rejected" }, 400);
    if (reqRow[statusColumn] !== "pending") return json({ message: "Already processed" }, 400);

    if (type === "mgmt" && reqRow.deptApprovalStatus !== "approved") {
      return json({ message: "Awaiting department approval first" }, 400);
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const updates: Record<string, unknown> = { [statusColumn]: newStatus };

    const deptOk = type === "dept" ? newStatus === "approved" : reqRow.deptApprovalStatus === "approved";
    const mgmtOk = type === "mgmt" ? newStatus === "approved" : reqRow.mgmtApprovalStatus === "approved";

    if (newStatus === "rejected") {
      updates.status = "rejected";
    } else if (deptOk && mgmtOk) {
      // Final stage will be admin (in-app). Move to mgmt_approved until admin approves.
      updates.status = reqRow.adminApprovalStatus === "approved" ? "approved" : "mgmt_approved";
    } else if (type === "dept" && newStatus === "approved") {
      updates.status = "dept_approved";
    }

    const { error: updErr } = await supabase
      .from("loans")
      .update(updates)
      .eq("id", id);

    if (updErr) return json({ message: updErr.message }, 500);

    return json({ message: `Loan ${newStatus} successfully` });
  }

  return json({ message: "Method not allowed" }, 405);
});
