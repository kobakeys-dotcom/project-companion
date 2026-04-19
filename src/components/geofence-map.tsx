import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Vite doesn't resolve Leaflet's image asset URLs)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface GeofenceMapProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (lat == null || lng == null) return;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (lastRef.current === key) return;
    lastRef.current = key;
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

export function GeofenceMap({ latitude, longitude, radiusMeters, onChange }: GeofenceMapProps) {
  // If no pin is set yet, try to coarsely locate the user so the map opens
  // near their country instead of a hardcoded city.
  const [fallbackCenter, setFallbackCenter] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (latitude != null && longitude != null) return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setFallbackCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, [latitude, longitude]);

  const center = useMemo<[number, number]>(() => {
    if (latitude != null && longitude != null) return [latitude, longitude];
    if (fallbackCenter) return fallbackCenter;
    return [20, 0]; // Neutral world view until we know where the user is
  }, [latitude, longitude, fallbackCenter]);

  const initialZoom =
    latitude != null && longitude != null ? 15 : fallbackCenter ? 10 : 2;

  return (
    <div className="rounded-md overflow-hidden border" style={{ height: 260 }}>
      <MapContainer
        key={`${center[0].toFixed(2)}-${center[1].toFixed(2)}-${initialZoom}`}
        center={center}
        zoom={initialZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        {/* CARTO Voyager tiles use English/Latin labels worldwide */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
        />
        <ClickHandler onChange={onChange} />
        <Recenter lat={latitude} lng={longitude} />
        {latitude != null && longitude != null && (
          <>
            <Marker
              position={[latitude, longitude]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  onChange(ll.lat, ll.lng);
                },
              }}
            />
            <Circle
              center={[latitude, longitude]}
              radius={radiusMeters}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
