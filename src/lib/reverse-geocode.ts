/**
 * Reverse-geocode lat/lng to a human-readable place name using OpenStreetMap Nominatim.
 * Free, no API key required. Results are cached in localStorage by ~3-decimal grid (~110m).
 */
const CACHE_PREFIX = "revgeo:";

function cacheKey(lat: number, lng: number) {
  return `${CACHE_PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function getCachedPlace(lat: number, lng: number): string | null {
  try {
    return localStorage.getItem(cacheKey(lat, lng));
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = cacheKey(lat, lng);
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch {
    // ignore
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.neighbourhood || a.suburb || a.village || a.hamlet || a.town || a.city_district,
      a.city || a.town || a.municipality,
      a.state,
      a.country,
    ].filter(Boolean);
    const name: string = parts.length ? parts.slice(0, 3).join(", ") : (data.display_name || "");
    if (name) {
      try { localStorage.setItem(key, name); } catch { /* quota */ }
      return name;
    }
    return null;
  } catch {
    return null;
  }
}
