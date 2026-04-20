// Public token-based leave approval endpoint (no auth required)
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
  // Path: /approve-leave/<type>/<id>
  const parts = url.pathname.split("/").filter(Boolean);
  const type = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  const token = url.searchParams.get("token") || "";

  if (type !== "dept" && type !== "mgmt") return json({ message: "Invalid approval type" }, 400);
  if (!id || !token) return json({ message: "Missing id or token" }, 400);

  const statusColumn = type === "dept" ? "deptApprovalStatus" : "mgmtApprovalStatus";

  // Load request and verify token from the request row itself.
  const { data: reqRow, error: reqErr } = await supabase
    .from("time_off_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (reqErr || !reqRow) return json({ message: "Request not found" }, 404);

  const expected = type === "dept" ? reqRow.deptApprovalToken : reqRow.mgmtApprovalToken;
  if (!expected || expected !== token) {
    return json({ message: "Invalid or expired token" }, 403);
  }

  // Hydrate related entities
  const [{ data: emp }, { data: leaveType }] = await Promise.all([
    supabase.from("employees").select("firstName,lastName,email,departmentId").eq("id", reqRow.employeeId).maybeSingle(),
    reqRow.leaveTypeId
      ? supabase.from("leave_types").select("name,color,requiresDeptApproval,requiresMgmtApproval").eq("id", reqRow.leaveTypeId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let departmentName: string | null = null;
  if (emp?.departmentId) {
    const { data: dept } = await supabase.from("departments").select("name").eq("id", emp.departmentId).maybeSingle();
    departmentName = dept?.name ?? null;
  }

  const details = {
    id: reqRow.id,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
    employeeEmail: emp?.email ?? "",
    departmentName,
    leaveTypeName: leaveType?.name ?? reqRow.type ?? "Leave",
    leaveTypeColor: leaveType?.color ?? "#6366f1",
    startDate: reqRow.startDate,
    endDate: reqRow.endDate,
    reason: reqRow.reason,
    status: reqRow.status,
    deptApprovalStatus: reqRow.deptApprovalStatus,
    mgmtApprovalStatus: reqRow.mgmtApprovalStatus,
    adminApprovalStatus: reqRow.adminApprovalStatus,
    requiresDeptApproval: leaveType?.requiresDeptApproval ?? true,
    requiresMgmtApproval: leaveType?.requiresMgmtApproval ?? true,
  };

  if (req.method === "GET") return json(details);

  if (req.method === "POST") {
    let body: { action?: string; notes?: string } = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const action = body.action;
    if (action !== "approve" && action !== "reject") return json({ message: "Invalid action" }, 400);

    if (reqRow.status === "rejected") return json({ message: "Request already rejected" }, 400);
    if (reqRow[statusColumn] !== "pending") return json({ message: "Already processed" }, 400);

    // For mgmt, require dept approved if needed
    if (type === "mgmt" && details.requiresDeptApproval && reqRow.deptApprovalStatus !== "approved") {
      return json({ message: "Awaiting department approval first" }, 400);
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const updates: Record<string, unknown> = { [statusColumn]: newStatus };

    // Compute overall status
    const deptOk = !details.requiresDeptApproval || (type === "dept" ? newStatus === "approved" : reqRow.deptApprovalStatus === "approved");
    const mgmtOk = !details.requiresMgmtApproval || (type === "mgmt" ? newStatus === "approved" : reqRow.mgmtApprovalStatus === "approved");

    if (newStatus === "rejected") {
      updates.status = "rejected";
    } else if (deptOk && mgmtOk) {
      // Still requires admin? Keep pending until admin approves; otherwise approved.
      updates.status = reqRow.adminApprovalStatus === "approved" ? "approved" : "pending";
    }

    const { error: updErr } = await supabase
      .from("time_off_requests")
      .update(updates)
      .eq("id", id);

    if (updErr) return json({ message: updErr.message }, 500);

    return json({ message: `Request ${newStatus} successfully` });
  }

  return json({ message: "Method not allowed" }, 405);
});
