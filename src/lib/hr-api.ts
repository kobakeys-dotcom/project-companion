/**
 * Thin Supabase data layer used by the existing pages via queryClient.
 *
 * The pages use TanStack Query keys like `["/api/employees"]`,
 * `["/api/departments"]`, `["/api/accommodations", id, "rooms"]` and
 * mutate via `apiRequest("POST"|"PATCH"|"DELETE", path, body)`.
 *
 * This module:
 *   1. Translates those keys/paths to Supabase calls.
 *   2. Returns the same camelCase row shapes the UI already expects (column
 *      names in DB are quoted camelCase to match).
 */
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

// ---------- helpers ----------
async function listByCompany(table: string) {
  const { data, error } = await sb
    .from(table)
    .select("*")
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function listRooms(accommodationId: string) {
  const { data, error } = await sb
    .from("accommodation_rooms")
    .select("*")
    .eq("accommodationId", accommodationId)
    .order("createdAt", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getOne(table: string, id: string) {
  const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function getCallerCompanyId(): Promise<string> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: prof } = await sb
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prof?.company_id) throw new Error("No company linked to your account");
  return prof.company_id as string;
}

// ---------- READ router ----------
export async function hrFetch(path: string, segments: unknown[]): Promise<unknown> {
  // /api/employees — try full table (managers/self), fallback to directory RPC for regular members
  if (path === "/api/employees" && segments.length === 1) {
    const { data, error } = await sb
      .from("employees")
      .select("*")
      .order("createdAt", { ascending: false });
    if (!error && data && data.length > 0) return data;
    // Fallback: directory view (no sensitive columns) for non-manager members
    const { data: dir, error: dirErr } = await sb.rpc("list_employees_directory");
    if (dirErr) throw new Error(error?.message ?? dirErr.message);
    return dir ?? [];
  }
  // /api/employees/:id
  if (segments[0] === "/api/employees" && segments[1] && segments.length === 2) {
    return getOne("employees", String(segments[1]));
  }
  // /api/employees/:id/attendance/active  -> latest open time entry
  if (
    segments[0] === "/api/employees" &&
    segments[2] === "attendance" &&
    segments[3] === "active"
  ) {
    const { data, error } = await sb
      .from("time_entries")
      .select("*")
      .eq("employeeId", String(segments[1]))
      .is("clockOut", null)
      .order("clockIn", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  if (path === "/api/departments") return listByCompany("departments");
  if (path === "/api/projects") return listByCompany("projects");
  if (path === "/api/accommodations" && segments.length === 1) {
    return listByCompany("accommodations");
  }
  if (
    segments[0] === "/api/accommodations" &&
    segments[2] === "rooms" &&
    segments[1]
  ) {
    return listRooms(String(segments[1]));
  }

  // ---- Phase 3 ----
  if (path === "/api/leave-types") return listByCompany("leave_types");
  if (path === "/api/time-off") return listByCompany("time_off_requests");
  if (path === "/api/attendance") return listByCompany("time_entries");
  if (path === "/api/documents") return listByCompany("documents");

  // ---- Phase 4 ----
  if (path === "/api/expense-types") return listByCompany("expense_types");
  if (path === "/api/expenses") return listByCompany("expenses");
  if (path === "/api/benefit-types") return listByCompany("benefit_types");
  if (path === "/api/benefits") return listByCompany("benefits");
  if (path === "/api/payroll") return listByCompany("payroll_records");

  // ---- Phase 5 ----
  if (path === "/api/performance-reviews" || path === "/api/reviews") return listByCompany("performance_reviews");
  if (path === "/api/jobs") return listByCompany("jobs");
  if (path === "/api/job-candidates") return listByCompany("job_candidates");

  // ---- Company-wide settings ----
  if (path === "/api/settings") {
    const companyId = await getCallerCompanyId();
    const { data: existing, error } = await sb
      .from("company_settings")
      .select("*")
      .eq("companyId", companyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (existing) return existing;
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
      const { data: again } = await sb
        .from("company_settings")
        .select("*")
        .eq("companyId", companyId)
        .maybeSingle();
      return again ?? null;
    }
    return created;
  }

  // Unknown — return empty so legacy keys don't crash
  return null;
}

// ---------- MUTATION router ----------
export async function hrMutate(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<unknown> {
  // ---- Departments ----
  if (path === "/api/departments" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("departments", { ...(body as object), companyId });
  }
  const deptMatch = path.match(/^\/api\/departments\/([^/]+)$/);
  if (deptMatch) return updateOrDelete("departments", deptMatch[1], method, body);

  // ---- Projects ----
  if (path === "/api/projects" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("projects", { ...(body as object), companyId });
  }
  const projMatch = path.match(/^\/api\/projects\/([^/]+)$/);
  if (projMatch) return updateOrDelete("projects", projMatch[1], method, body);

  // ---- Accommodations ----
  if (path === "/api/accommodations" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("accommodations", { ...(body as object), companyId });
  }
  const accMatch = path.match(/^\/api\/accommodations\/([^/]+)$/);
  if (accMatch) return updateOrDelete("accommodations", accMatch[1], method, body);

  // Rooms: POST /api/accommodations/:id/rooms
  const roomCreate = path.match(/^\/api\/accommodations\/([^/]+)\/rooms$/);
  if (roomCreate && method === "POST") {
    return insert("accommodation_rooms", {
      ...(body as object),
      accommodationId: roomCreate[1],
    });
  }
  const roomDel = path.match(/^\/api\/accommodation-rooms\/([^/]+)$/);
  if (roomDel) return updateOrDelete("accommodation_rooms", roomDel[1], method, body);

  // ---- Employees ----
  if (path === "/api/employees" && method === "POST") {
    const { data, error } = await sb.functions.invoke("create-employee", { body });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return (data as any)?.employee;
  }
  const empMatch = path.match(/^\/api\/employees\/([^/]+)$/);
  if (empMatch) return updateOrDelete("employees", empMatch[1], method, body);

  // ---- Phase 3: Leave types ----
  if (path === "/api/leave-types" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("leave_types", { ...(body as object), companyId });
  }
  const ltMatch = path.match(/^\/api\/leave-types\/([^/]+)$/);
  if (ltMatch) return updateOrDelete("leave_types", ltMatch[1], method, body);

  // ---- Phase 3: Time-off requests ----
  if (path === "/api/time-off" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("time_off_requests", { ...(body as object), companyId });
  }
  // PATCH /api/time-off/:id/dept-approval | mgmt-approval | admin-approval
  const approvalMatch = path.match(
    /^\/api\/time-off\/([^/]+)\/(dept|mgmt|admin)-approval$/,
  );
  if (approvalMatch && method === "PATCH") {
    const id = approvalMatch[1];
    const which = approvalMatch[2]; // dept | mgmt | admin
    const action = (body as any)?.action; // 'approve' | 'reject'
    const newStatus = action === "approve" ? "approved" : "rejected";
    const col =
      which === "dept"
        ? "deptApprovalStatus"
        : which === "mgmt"
        ? "mgmtApprovalStatus"
        : "adminApprovalStatus";

    // Update the requested approval column.
    const { data: updated, error } = await sb
      .from("time_off_requests")
      .update({ [col]: newStatus })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Recompute the overall status.
    const lt = updated.leaveTypeId
      ? (await sb.from("leave_types").select("requiresDeptApproval,requiresMgmtApproval").eq("id", updated.leaveTypeId).maybeSingle()).data
      : null;
    const reqDept = lt?.requiresDeptApproval ?? true;
    const reqMgmt = lt?.requiresMgmtApproval ?? true;

    let overall: string = updated.status;
    if (
      updated.deptApprovalStatus === "rejected" ||
      updated.mgmtApprovalStatus === "rejected" ||
      updated.adminApprovalStatus === "rejected"
    ) {
      overall = "rejected";
    } else if (
      (!reqDept || updated.deptApprovalStatus === "approved") &&
      (!reqMgmt || updated.mgmtApprovalStatus === "approved") &&
      updated.adminApprovalStatus === "approved"
    ) {
      overall = "approved";
    } else if (reqMgmt && updated.mgmtApprovalStatus === "approved") {
      overall = "mgmt_approved";
    } else if (reqDept && updated.deptApprovalStatus === "approved") {
      overall = "dept_approved";
    } else {
      overall = "pending";
    }

    if (overall !== updated.status) {
      const { data: final, error: e2 } = await sb
        .from("time_off_requests")
        .update({ status: overall })
        .eq("id", id)
        .select()
        .single();
      if (e2) throw new Error(e2.message);
      return final;
    }
    return updated;
  }
  // PATCH /api/time-off/:id/return-date
  const returnMatch = path.match(/^\/api\/time-off\/([^/]+)\/return-date$/);
  if (returnMatch && method === "PATCH") {
    return updateOrDelete("time_off_requests", returnMatch[1], "PATCH", {
      actualReturnDate: (body as any)?.actualReturnDate ?? null,
    });
  }
  const toMatch = path.match(/^\/api\/time-off\/([^/]+)$/);
  if (toMatch) return updateOrDelete("time_off_requests", toMatch[1], method, body);

  // ---- Phase 3: Attendance ----
  if (path === "/api/attendance/clock-in" && method === "POST") {
    const companyId = await getCallerCompanyId();
    const employeeId = (body as any)?.employeeId;
    if (!employeeId) throw new Error("employeeId is required");
    return insert("time_entries", {
      companyId,
      employeeId,
      clockIn: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      clockInLatitude: (body as any)?.latitude ?? null,
      clockInLongitude: (body as any)?.longitude ?? null,
      clockInLocation: (body as any)?.location ?? null,
    });
  }
  if (path === "/api/attendance/clock-out" && method === "POST") {
    const employeeId = (body as any)?.employeeId;
    if (!employeeId) throw new Error("employeeId is required");
    // Find the latest open entry for this employee.
    const { data: open, error: openErr } = await sb
      .from("time_entries")
      .select("id")
      .eq("employeeId", employeeId)
      .is("clockOut", null)
      .order("clockIn", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (openErr) throw new Error(openErr.message);
    if (!open) throw new Error("No active clock-in found for this employee");
    const { data, error } = await sb
      .from("time_entries")
      .update({
        clockOut: new Date().toISOString(),
        breakMinutes: (body as any)?.breakMinutes ?? 0,
        clockOutLatitude: (body as any)?.latitude ?? null,
        clockOutLongitude: (body as any)?.longitude ?? null,
        clockOutLocation: (body as any)?.location ?? null,
      })
      .eq("id", open.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const teMatch = path.match(/^\/api\/attendance\/([^/]+)$/);
  if (teMatch) return updateOrDelete("time_entries", teMatch[1], method, body);

  // ---- Phase 3: Documents ----
  if (path === "/api/documents" && method === "POST") {
    const companyId = await getCallerCompanyId();
    const { data: { user } } = await sb.auth.getUser();
    return insert("documents", {
      ...(body as object),
      companyId,
      uploadedBy: user?.id ?? null,
    });
  }
  const docMatch = path.match(/^\/api\/documents\/([^/]+)$/);
  if (docMatch) return updateOrDelete("documents", docMatch[1], method, body);

  // ---- Phase 4: Expense types ----
  if (path === "/api/expense-types" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("expense_types", { ...(body as object), companyId });
  }
  const etMatch = path.match(/^\/api\/expense-types\/([^/]+)$/);
  if (etMatch) return updateOrDelete("expense_types", etMatch[1], method, body);

  // ---- Phase 4: Expenses ----
  if (path === "/api/expenses" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("expenses", { ...(body as object), companyId });
  }
  const expMatch = path.match(/^\/api\/expenses\/([^/]+)$/);
  if (expMatch) return updateOrDelete("expenses", expMatch[1], method, body);

  // ---- Phase 4: Benefit types ----
  if (path === "/api/benefit-types" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("benefit_types", { ...(body as object), companyId });
  }
  const btMatch = path.match(/^\/api\/benefit-types\/([^/]+)$/);
  if (btMatch) return updateOrDelete("benefit_types", btMatch[1], method, body);

  // ---- Phase 4: Benefits ----
  if (path === "/api/benefits" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("benefits", { ...(body as object), companyId });
  }
  const benMatch = path.match(/^\/api\/benefits\/([^/]+)$/);
  if (benMatch) return updateOrDelete("benefits", benMatch[1], method, body);

  // ---- Phase 4: Payroll ----
  if (path === "/api/payroll" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("payroll_records", { ...(body as object), companyId });
  }
  const payMatch = path.match(/^\/api\/payroll\/([^/]+)$/);
  if (payMatch) return updateOrDelete("payroll_records", payMatch[1], method, body);

  // ---- Phase 5: Performance reviews ----
  if ((path === "/api/performance-reviews" || path === "/api/reviews") && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("performance_reviews", { ...(body as object), companyId });
  }
  const prMatch = path.match(/^\/api\/(?:performance-reviews|reviews)\/([^/]+)$/);
  if (prMatch) return updateOrDelete("performance_reviews", prMatch[1], method, body);

  // ---- Phase 5: Jobs ----
  if (path === "/api/jobs" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("jobs", { ...(body as object), companyId });
  }
  const jobMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (jobMatch) return updateOrDelete("jobs", jobMatch[1], method, body);

  // ---- Phase 5: Job candidates ----
  if (path === "/api/job-candidates" && method === "POST") {
    const companyId = await getCallerCompanyId();
    return insert("job_candidates", { ...(body as object), companyId });
  }
  const candMatch = path.match(/^\/api\/job-candidates\/([^/]+)$/);
  if (candMatch) return updateOrDelete("job_candidates", candMatch[1], method, body);

  throw new Error(`Unsupported ${method} ${path}`);
}

async function insert(table: string, row: object) {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateOrDelete(
  table: string,
  id: string,
  method: string,
  body?: unknown,
) {
  if (method === "DELETE") {
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  }
  const { data, error } = await sb
    .from(table)
    .update(body as object)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
