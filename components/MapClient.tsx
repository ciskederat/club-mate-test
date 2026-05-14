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
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

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

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const getDistanceKm = ([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const formatDistance = (distance?: number) => {
    if (distance == null) return "Onbekend";
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(1)} km`;
  };

  const listPlaces = useMemo(() => {
    const filtered = normalizedFilter === "all"
      ? safePlaces
      : safePlaces.filter((place: any) => normalizeType(place.type) === normalizedFilter);

    return filtered
      .map((place: any) => ({
        ...place,
        distance: userLocation ? getDistanceKm(userLocation, place.position) : undefined,
      }))
      .sort((a: any, b: any) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
  }, [safePlaces, normalizedFilter, userLocation]);

  if (!mounted) return null;

  return (
    <div className="w-screen h-screen relative">
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow">
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm transition ${
            viewMode === "map"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-800 hover:bg-slate-200"
          }`}
          onClick={() => setViewMode("map")}
        >
          Kaart
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm transition ${
            viewMode === "list"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-800 hover:bg-slate-200"
          }`}
          onClick={() => setViewMode("list")}
        >
          Lijst
        </button>
      </div>

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
      </div>

      {viewMode === "map" ? (
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
      ) : (
        <div className="absolute inset-0 overflow-auto bg-slate-50 p-4 pt-24">
          <div className="max-w-4xl mx-auto space-y-4">
            {listPlaces.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
                Geen locaties gevonden voor deze filter.
              </div>
            ) : (
              listPlaces.map((place: any) => (
                <div key={place.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{place.name}</div>
                      <div className="text-sm text-slate-500">{place.type === "cafe" ? "Café" : place.type === "shop" ? "Supermarkt" : place.type}</div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {formatDistance(place.distance)}
                    </div>
                  </div>
                  <div className="mt-3 text-slate-600">{place.info}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
