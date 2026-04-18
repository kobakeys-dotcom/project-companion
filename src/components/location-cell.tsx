/**
 * Renders a location cell that:
 * - Shows the stored place name if it looks like a real address.
 * - Otherwise reverse-geocodes lat/lng on demand and caches the result.
 * - Click opens Google Maps at the exact coordinates.
 */
import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { reverseGeocode, getCachedPlace } from "@/lib/reverse-geocode";

interface Props {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  fallbackText?: string | null;
  className?: string;
  testId?: string;
}

function looksLikeCoords(s: string): boolean {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s.trim());
}

export function LocationCell({ latitude, longitude, fallbackText, className, testId }: Props) {
  const lat = latitude == null ? null : typeof latitude === "string" ? parseFloat(latitude) : latitude;
  const lng = longitude == null ? null : typeof longitude === "string" ? parseFloat(longitude) : longitude;
  const hasCoords = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  const initial =
    fallbackText && !looksLikeCoords(fallbackText)
      ? fallbackText
      : hasCoords
        ? getCachedPlace(lat!, lng!)
        : null;
  const [name, setName] = useState<string | null>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (name || !hasCoords) return;
    let cancelled = false;
    setLoading(true);
    reverseGeocode(lat!, lng!)
      .then((n) => { if (!cancelled && n) setName(n); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  if (!hasCoords && !fallbackText) {
    return <span className="text-muted-foreground">-</span>;
  }

  const label = name || fallbackText || (hasCoords ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : "-");

  if (hasCoords) {
    return (
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1 text-sm text-primary hover:underline ${className ?? ""}`}
        data-testid={testId}
        title={label}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        {loading && !name ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="truncate">{label}</span>
        )}
      </a>
    );
  }
  return (
    <span className={`flex items-center gap-1 text-sm ${className ?? ""}`}>
      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
