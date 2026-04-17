import { supabase } from "@/integrations/supabase/client";

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface ProjectFenceRow {
  id: string;
  name: string;
  geofenceEnabled: boolean | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
}

/**
 * Check whether the point falls inside the employee's assigned project geofence.
 * - If the employee has no project, or the project has geofencing disabled, returns ok:true, enforced:false.
 * - If the project has geofencing enabled but coordinates are missing, treats as not enforced (fails open).
 * - If enabled and coordinates exist, requires the point to be within radiusMeters of the project center.
 */
export async function checkProjectGeofence(
  projectId: string | null | undefined,
  lat: number,
  lng: number,
): Promise<{
  ok: boolean;
  enforced: boolean;
  project?: { id: string; name: string };
  distance?: number;
  radiusMeters?: number;
}> {
  if (!projectId) return { ok: true, enforced: false };

  const { data, error } = await (supabase as any)
    .from("projects")
    .select("id,name,geofenceEnabled,latitude,longitude,radiusMeters")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return { ok: true, enforced: false };
  const p = data as ProjectFenceRow;

  if (!p.geofenceEnabled || p.latitude == null || p.longitude == null) {
    return { ok: true, enforced: false };
  }

  const radius = p.radiusMeters ?? 100;
  const d = distanceMeters(lat, lng, Number(p.latitude), Number(p.longitude));
  return {
    ok: d <= radius,
    enforced: true,
    project: { id: p.id, name: p.name },
    distance: d,
    radiusMeters: radius,
  };
}

/** @deprecated Use checkProjectGeofence keyed on the employee's projectId. */
export const checkGeofence = checkProjectGeofence;
