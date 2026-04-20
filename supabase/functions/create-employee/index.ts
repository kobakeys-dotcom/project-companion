/**
 * Creates an employee record AND a Supabase auth user in one shot.
 * Only callable by authenticated admins/managers of the same company.
 *
 * The auth user gets the 'employee' role + the caller's company_id, so the
 * employee can sign in via /employee/login and see only company-scoped data.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmployeePayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  // Everything else is optional and merged into the employees row.
  [key: string]: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // Caller-scoped client to enforce RLS / get the current user
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ error: "Not authenticated" }, 401);
    }

    // Admin client (bypasses RLS) for createUser + insert
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Resolve caller's company + role (manager-level required)
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    const companyId = callerProfile?.company_id as string | null;
    if (!companyId) {
      return json({ error: "Caller has no company" }, 403);
    }

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roles = (callerRoles ?? []).map((r) => r.role);
    const isManager =
      roles.includes("admin") ||
      roles.includes("manager") ||
      roles.includes("super_admin");
    if (!isManager) {
      return json({ error: "Forbidden" }, 403);
    }

    const payload = (await req.json()) as EmployeePayload;
    if (!payload?.email || !payload?.password) {
      return json({ error: "email and password are required" }, 400);
    }
    if (payload.password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    // 1. Create the auth user (auto-confirmed so they can log in immediately).
    //    If the email already exists, reuse that user — but only if they
    //    aren't already linked to an employee record in another company.
    let newUserId: string;
    let reusedExistingUser = false;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        first_name: payload.firstName,
        last_name: payload.lastName,
        role: "employee",
      },
    });

    if (createErr || !created?.user) {
      const msg = (createErr?.message || "").toLowerCase();
      const alreadyExists =
        msg.includes("already") ||
        msg.includes("registered") ||
        (createErr as { code?: string } | null)?.code === "email_exists";

      if (!alreadyExists) {
        return json({ error: createErr?.message || "Could not create user" }, 400);
      }

      // Look up the existing auth user by email
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) {
        return json({ error: listErr.message }, 400);
      }
      const existing = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === payload.email.toLowerCase(),
      );
      if (!existing) {
        return json({ error: "User exists but could not be located" }, 400);
      }

      // Block reuse if already an employee somewhere
      const { data: existingEmployee } = await admin
        .from("employees")
        .select("id, companyId")
        .eq("userId", existing.id)
        .maybeSingle();
      if (existingEmployee) {
        return json(
          {
            error:
              "An employee with this email already exists. Use a different email address.",
          },
          409,
        );
      }

      newUserId = existing.id;
      reusedExistingUser = true;

      // Reset password so the admin's chosen password works
      await admin.auth.admin.updateUserById(newUserId, {
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          first_name: payload.firstName,
          last_name: payload.lastName,
          role: "employee",
        },
      });
    } else {
      newUserId = created.user.id;
    }

    // 2. Trigger handle_new_user already inserted profile + 'employee' role.
    //    Attach company_id to both.
    await admin
      .from("profiles")
      .update({ company_id: companyId })
      .eq("user_id", newUserId);
    await admin
      .from("user_roles")
      .update({ company_id: companyId })
      .eq("user_id", newUserId)
      .eq("role", "employee");

    // 3. Build employee row — strip auth-only fields, force company link
    const { password: _pw, ...rest } = payload;

    // Convert empty strings to null for UUID + date columns to avoid
    // "invalid input syntax for type uuid: """ / date errors.
    const UUID_FIELDS = new Set([
      "departmentId",
      "projectId",
      "accommodationId",
      "roomId",
    ]);
    const DATE_FIELDS = new Set([
      "startDate",
      "passportExpiryDate",
      "visaExpiryDate",
      "workPermitExpiryDate",
      "insuranceExpiryDate",
      "medicalExpiryDate",
      "quotaExpiryDate",
      "uniformIssuedDate",
      "safetyShoeIssuedDate",
      "lastPromotionDate",
      "contractSignedDate",
      "contractExpiryDate",
      "dateOfBirth",
    ]);
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if ((UUID_FIELDS.has(k) || DATE_FIELDS.has(k)) && v === "") {
        cleaned[k] = null;
      } else {
        cleaned[k] = v;
      }
    }

    const employeeRow = {
      ...cleaned,
      companyId,
      userId: newUserId,
    };

    const { data: employee, error: empErr } = await admin
      .from("employees")
      .insert(employeeRow)
      .select()
      .single();

    if (empErr) {
      // Roll back only if we created the auth user in this call
      if (!reusedExistingUser) {
        await admin.auth.admin.deleteUser(newUserId);
      }
      const friendly = empErr.message?.includes("employees_company_code_unique")
        ? "That Employee ID is already in use. Choose a different one."
        : empErr.message;
      return json({ error: friendly }, 400);
    }

    return json({ employee }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
