"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const icon = new L.Icon({
  iconUrl: "/custom-pin.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "user-marker",
});

const filterOptions = [
  { value: "all", label: "Alles" },
  { value: "cafe", label: "Cafés" },
  { value: "shop", label: "Supermarkten" },
];

const normalizeType = (value: any) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

export default function MapClient({ places }: any) {
  const [filter, setFilter] = useState("all");
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "prompt" | "granted" | "denied" | "unavailable">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      setLocationError("Geolocatie niet ondersteund");
      return;
    }

    const updatePosition = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setUserLocation([latitude, longitude]);
      setLocationStatus("granted");
      setLocationError(null);
    };

    const handleError = (error: GeolocationPositionError) => {
      setUserLocation(null);
      if (error.code === 1) {
        setLocationStatus("denied");
        setLocationError("Toestemming geweigerd. Controleer Safari instellingen en laad de pagina opnieuw.");
      } else if (error.code === 2) {
        setLocationStatus("denied");
        setLocationError("Locatie niet beschikbaar.");
      } else if (error.code === 3) {
        setLocationStatus("denied");
        setLocationError("Timeout bij ophalen locatie.");
      } else {
        setLocationStatus("denied");
        setLocationError(error.message || "Locatie niet beschikbaar");
      }
    };

    const startWatch = () => {
      setLocationStatus("prompt");
      setLocationError(null);
      return navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0,
      });
    };

    let watchId: number | null = null;

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === "denied") {
            setLocationStatus("denied");
          } else {
            watchId = startWatch();
          }
        })
        .catch(() => {
          watchId = startWatch();
        });
    } else {
      watchId = startWatch();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const safePlaces = useMemo(() => (Array.isArray(places) ? places : []), [places]);
  const normalizedFilter = useMemo(() => normalizeType(filter), [filter]);

  const visiblePlaces = useMemo(
    () =>
      normalizedFilter === "all"
        ? safePlaces
        : safePlaces.filter((place: any) => normalizeType(place.type) === normalizedFilter),
    [safePlaces, normalizedFilter],
  );

  if (!mounted) return null;

  return (
    <div className="w-screen h-screen relative">
      <div className="absolute top-4 right-4 z-[1000] flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rounded px-3 py-1 text-sm transition ${
              filter === option.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          className="rounded px-3 py-1 text-sm bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => setShowInfoPanel((open) => !open)}
        >
          {showInfoPanel ? "Verberg info" : "Toon info"}
        </button>
      </div>

      {showInfoPanel && (
        <div className="absolute bottom-4 left-4 z-[1000] w-[min(320px,calc(100vw-2rem))] bg-white p-3 rounded-xl shadow text-sm text-slate-700">
        <div>
          <strong>Filter:</strong> {filter}
        </div>
        <div>
          <strong>Results:</strong> {visiblePlaces.length}
        </div>
        <div>
          <strong>Locatie status:</strong>{" "}
          {locationStatus === "idle"
            ? "Nog niet gevraagd"
            : locationStatus === "prompt"
            ? "Vraagt locatie..."
            : locationStatus === "granted"
            ? "Gevonden"
            : locationStatus === "denied"
            ? "Geblokkeerd"
            : "Niet ondersteund"}
        </div>
        <div>
          <strong>Je locatie:</strong>{" "}
          {userLocation ? `✓ ${userLocation[0].toFixed(3)}, ${userLocation[1].toFixed(3)}` : "✗ Niet beschikbaar"}
        </div>
        {locationStatus === "denied" && (
          <div className="mt-2 text-xs text-slate-500">
            Safari kan geolocatie alleen opnieuw proberen na een pagina-refresh als toestemming in de browserinstellingen is gewijzigd.
          </div>
        )}
        {locationError && (
          <div className="text-red-600">
            <strong>Fout:</strong> {locationError}
          </div>
        )}
      </div>
      )}

      <MapContainer center={[51.2194, 4.4025]} zoom={13} className="w-full h-full">
        <TileLayer
          attribution='Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />

        {visiblePlaces.map((place: any) => (
          <Marker key={place.name} position={place.position} icon={icon}>
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.info}
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>📍 Jouw locatie</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
