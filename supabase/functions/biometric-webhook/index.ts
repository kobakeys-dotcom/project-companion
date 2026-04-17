// ZKTeco / CrossChex compatible webhook.
// Devices push punches identified by (deviceSerial OR deviceKey, pin).
// Status codes follow ZK convention: 0=check-in, 1=check-out, 2=break-out,
// 3=break-in, 4=overtime-in, 5=overtime-out.
// Every event is stored in biometric_raw_logs even if it can't be matched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-device-key, x-device-sn",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Punch {
  pin: string;
  statusCode: number; // 0=in, 1=out, 2=break-out, 3=break-in, 4=ot-in, 5=ot-out
  punchedAt?: string; // ISO; defaults to now
  verifyMode?: number; // 0=password, 1=fingerprint, 15=face, etc.
}

interface Payload {
  deviceSerial?: string;
  deviceKey?: string;
  punches?: Punch[]; // batch
  // legacy single-event shape
  pin?: string;
  statusCode?: number;
  punchedAt?: string;
  verifyMode?: number;
  // legacy v1 shape kept for back-compat
  employeeId?: string;
  email?: string;
  event?: "in" | "out";
  timestamp?: string;
}

function statusToEvent(code: number): "in" | "out" | null {
  if (code === 0 || code === 2 || code === 4) return "in"; // check-in / break-end / OT-in
  if (code === 1 || code === 3 || code === 5) return "out"; // check-out / break-start / OT-out
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json()) as Payload;
    const deviceSerial =
      body.deviceSerial || req.headers.get("x-device-sn") || undefined;
    const deviceKey =
      body.deviceKey || req.headers.get("x-device-key") || undefined;

    if (!deviceSerial && !deviceKey) {
      throw new Error("deviceSerial or deviceKey required");
    }

    // 1. Resolve device by serial first, then by key
    let deviceQuery = supabase
      .from("biometric_devices")
      .select('id, "companyId", "isActive", "serialNumber", "deviceKey"')
      .limit(1);
    deviceQuery = deviceSerial
      ? deviceQuery.eq("serialNumber", deviceSerial)
      : deviceQuery.eq("deviceKey", deviceKey!);
    const { data: device, error: devErr } = await deviceQuery.maybeSingle();
    if (devErr) throw devErr;
    if (!device || !device.isActive) {
      return new Response(
        JSON.stringify({ error: "Unknown or inactive device" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalise into a list of punches
    const punches: Punch[] = [];
    if (Array.isArray(body.punches) && body.punches.length) {
      punches.push(...body.punches);
    } else if (body.pin && body.statusCode != null) {
      punches.push({
        pin: body.pin,
        statusCode: body.statusCode,
        punchedAt: body.punchedAt,
        verifyMode: body.verifyMode,
      });
    } else if (body.event && (body.employeeId || body.email)) {
      // Legacy v1 fall-back: treat as a single punch with pseudo-pin
      punches.push({
        pin: body.employeeId || body.email!,
        statusCode: body.event === "in" ? 0 : 1,
        punchedAt: body.timestamp,
      });
    } else {
      throw new Error("No punches in payload");
    }

    const results: Array<Record<string, unknown>> = [];

    for (const p of punches) {
      const punchedAt = p.punchedAt
        ? new Date(p.punchedAt).toISOString()
        : new Date().toISOString();
      const today = punchedAt.slice(0, 10);

      // Resolve employee from PIN map (fall back to direct employeeId/email for legacy v1)
      let employeeId: string | null = null;
      if (body.event && (body.employeeId || body.email)) {
        const empQuery = supabase
          .from("employees")
          .select("id")
          .eq("companyId", device.companyId)
          .limit(1);
        const { data: emp } = body.employeeId
          ? await empQuery.eq("id", body.employeeId).maybeSingle()
          : await empQuery.eq("email", body.email!).maybeSingle();
        employeeId = emp?.id ?? null;
      } else {
        const { data: map } = await supabase
          .from("biometric_pin_map")
          .select('"employeeId"')
          .eq("deviceId", device.id)
          .eq("pin", p.pin)
          .maybeSingle();
        employeeId = map?.employeeId ?? null;

        // Fallback: company-wide PIN (no specific device)
        if (!employeeId) {
          const { data: fallback } = await supabase
            .from("biometric_pin_map")
            .select('"employeeId"')
            .eq("companyId", device.companyId)
            .is("deviceId", null)
            .eq("pin", p.pin)
            .maybeSingle();
          employeeId = fallback?.employeeId ?? null;
        }
      }

      let matched = !!employeeId;
      let errorMessage: string | null = null;

      if (employeeId) {
        const event = statusToEvent(p.statusCode);
        if (!event) {
          errorMessage = `Unsupported statusCode ${p.statusCode}`;
          matched = false;
        } else if (event === "in") {
          const { error } = await supabase.from("time_entries").insert({
            companyId: device.companyId,
            employeeId,
            clockIn: punchedAt,
            date: today,
            deviceId: device.id,
            source: "biometric",
          });
          if (error) errorMessage = error.message;
        } else {
          const { data: open } = await supabase
            .from("time_entries")
            .select("id")
            .eq("employeeId", employeeId)
            .is("clockOut", null)
            .order("clockIn", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!open) {
            errorMessage = "No open shift to clock out";
          } else {
            const { error } = await supabase
              .from("time_entries")
              .update({ clockOut: punchedAt })
              .eq("id", open.id);
            if (error) errorMessage = error.message;
          }
        }
      } else {
        errorMessage = `PIN ${p.pin} not mapped`;
      }

      // Always record raw log
      await supabase.from("biometric_raw_logs").insert({
        companyId: device.companyId,
        deviceId: device.id,
        deviceSerial: device.serialNumber ?? null,
        pin: p.pin,
        employeeId,
        statusCode: p.statusCode,
        verifyMode: p.verifyMode ?? null,
        punchedAt,
        rawPayload: p as unknown as Record<string, unknown>,
        matched: matched && !errorMessage,
        errorMessage,
      });

      results.push({
        pin: p.pin,
        punchedAt,
        matched: matched && !errorMessage,
        error: errorMessage,
      });
    }

    // Touch device lastSeenAt
    await supabase
      .from("biometric_devices")
      .update({ lastSeenAt: new Date().toISOString() })
      .eq("id", device.id);

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("biometric-webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
