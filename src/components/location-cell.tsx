/**
 * Renders a location cell that:
 * - Shows the stored place name (or reverse-geocodes lat/lng on demand).
 * - Click opens an inline Leaflet map popover at the exact coordinates,
 *   so it works even when google.com / openstreetmap.org are network-blocked.
 */
import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { reverseGeocode, getCachedPlace } from "@/lib/reverse-geocode";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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

  if (!hasCoords) {
    return (
      <span className={`flex items-center gap-1 text-sm ${className ?? ""}`}>
        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1 text-sm text-primary hover:underline max-w-full ${className ?? ""}`}
          data-testid={testId}
          title={label}
        >
          <MapPin className="h-3 w-3 shrink-0" />
          {loading && !name ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="truncate">{label}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
        <div className="p-2 text-xs border-b bg-muted">
          <div className="font-medium truncate">{label}</div>
          <div className="text-muted-foreground">{lat!.toFixed(5)}, {lng!.toFixed(5)}</div>
        </div>
        <div style={{ height: 200, width: "100%" }}>
          <MapContainer
            center={[lat!, lng!]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat!, lng!]} />
          </MapContainer>
        </div>
      </PopoverContent>
    </Popover>
  );
}
