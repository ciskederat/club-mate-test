"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { OpeningInterval, Place } from "@/data/places";

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

const dayLabels = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const shortDayLabels = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const weekdayToIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const placeTimeZone = "Europe/Brussels";

type PlaceWithDistance = Place & {
  distance?: number;
};

type OpenStatus = {
  isOpen: boolean;
  label: string;
};

const normalizeType = (value: unknown) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

const parseTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getBrusselsTimeParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: placeTimeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return {
    dayIndex: weekdayToIndex[weekday] ?? 1,
    minutes: hour * 60 + minute,
  };
};

const getOpenStatus = (place: Place, now: Date): OpenStatus => {
  const { dayIndex, minutes } = getBrusselsTimeParts(now);
  const todayHours = place.hours[dayIndex] ?? [];
  const previousDayIndex = (dayIndex + 6) % 7;
  const previousDayHours = place.hours[previousDayIndex] ?? [];

  const previousOvernight = previousDayHours.find((interval) => {
    const open = parseTime(interval.open);
    const close = parseTime(interval.close);
    return close <= open && minutes < close;
  });

  if (previousOvernight) {
    return {
      isOpen: true,
      label: `Open tot ${previousOvernight.close}`,
    };
  }

  const currentInterval = todayHours.find((interval) => {
    const open = parseTime(interval.open);
    const close = parseTime(interval.close);
    return close <= open ? minutes >= open : minutes >= open && minutes < close;
  });

  if (currentInterval) {
    return {
      isOpen: true,
      label: `Open tot ${currentInterval.close}`,
    };
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const candidateDayIndex = (dayIndex + offset) % 7;
    const candidateHours = place.hours[candidateDayIndex] ?? [];
    const nextInterval = candidateHours.find((interval) => offset > 0 || parseTime(interval.open) > minutes);

    if (nextInterval) {
      const dayLabel = offset === 0 ? "vandaag" : dayLabels[candidateDayIndex];
      return {
        isOpen: false,
        label: `Gesloten, opent ${dayLabel} om ${nextInterval.open}`,
      };
    }
  }

  return {
    isOpen: false,
    label: "Geen vaste openingsuren",
  };
};

const formatHours = (hours: OpeningInterval[][]) =>
  hours.map((intervals, index) => ({
    day: shortDayLabels[index],
    value: intervals.length === 0
      ? "Gesloten"
      : intervals.map((interval) => `${interval.open}-${interval.close}`).join(", "),
  }));

const typeLabel = (type: Place["type"]) => (type === "cafe" ? "Café" : "Supermarkt");

function OpenBadge({ status }: { status: OpenStatus }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <span
        className={`h-2.5 w-2.5 rounded-full ${status.isOpen ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-hidden="true"
      />
      <span>{status.label}</span>
    </div>
  );
}

function PlaceDetails({
  place,
  status,
  distance,
  onClose,
}: {
  place: Place;
  status: OpenStatus;
  distance?: number;
  onClose?: () => void;
}) {
  const [hoursOpen, setHoursOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{typeLabel(place.type)}</div>
          <div className="text-xl font-semibold text-slate-950">{place.name}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            onClick={onClose}
            aria-label="Sluit infovenster"
          >
            ×
          </button>
        )}
      </div>

      <OpenBadge status={status} />

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adres</div>
        <div className="text-sm text-slate-800">{place.address}</div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Info</div>
        <div className="text-sm text-slate-800">{place.info}</div>
      </div>

      {distance != null && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Afstand</div>
          <div className="text-sm text-slate-800">{formatDistance(distance)}</div>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-200"
          onClick={() => setHoursOpen((isOpen) => !isOpen)}
          aria-expanded={hoursOpen}
        >
          <span>Openingsuren</span>
          <span
            className={`text-base leading-none transition-transform ${hoursOpen ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            &gt;
          </span>
        </button>

        {hoursOpen && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 text-sm text-slate-800">
            {formatHours(place.hours).map((item) => (
              <div key={item.day} className="contents">
                <div className="font-medium text-slate-600">{item.day}</div>
                <div>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

export default function MapClient({ places }: { places: Place[] }) {
  const [filter, setFilter] = useState("all");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const updatePosition = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setUserLocation([latitude, longitude]);
    };

    const handleError = () => {
      setUserLocation(null);
    };

    const startWatch = () => {
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
          if (permissionStatus.state !== "denied") {
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
  const placeStatuses = useMemo(
    () => new Map(safePlaces.map((place) => [place.name, getOpenStatus(place, now)])),
    [safePlaces, now],
  );

  const visiblePlaces = useMemo(
    () =>
      normalizedFilter === "all"
        ? safePlaces
        : safePlaces.filter((place) => normalizeType(place.type) === normalizedFilter),
    [safePlaces, normalizedFilter],
  );

  const listPlaces = useMemo(() => {
    const filtered = normalizedFilter === "all"
      ? safePlaces
      : safePlaces.filter((place) => normalizeType(place.type) === normalizedFilter);

    return filtered
      .map((place) => ({
        ...place,
        distance: userLocation ? getDistanceKm(userLocation, place.position) : undefined,
      }))
      .sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
  }, [safePlaces, normalizedFilter, userLocation]);

  const selectedPlace = useMemo(
    () => safePlaces.find((place) => place.name === selectedPlaceName) ?? null,
    [safePlaces, selectedPlaceName],
  );
  const selectedPlaceDistance = useMemo(() => {
    if (!selectedPlace || !userLocation) return undefined;
    return getDistanceKm(userLocation, selectedPlace.position);
  }, [selectedPlace, userLocation]);

  const selectViewMode = (mode: "map" | "list") => {
    setSelectedPlaceName(null);
    setViewMode(mode);
  };

  const selectFilter = (value: string) => {
    setSelectedPlaceName(null);
    setFilter(value);
  };

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
          onClick={() => selectViewMode("map")}
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
          onClick={() => selectViewMode("list")}
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
            onClick={() => selectFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {viewMode === "map" ? (
        <MapContainer center={[51.2194, 4.4025]} zoom={13} className="w-full h-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {visiblePlaces.map((place) => (
          <Marker
            key={place.name}
            position={place.position}
            icon={icon}
            eventHandlers={{
              click: () => setSelectedPlaceName(place.name),
            }}
          />
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
              listPlaces.map((place: PlaceWithDistance) => {
                const status = placeStatuses.get(place.name) ?? getOpenStatus(place, now);

                return (
                <button
                  key={place.name}
                  type="button"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                  onClick={() => setSelectedPlaceName(place.name)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{place.name}</div>
                      <div className="text-sm text-slate-500">{typeLabel(place.type)}</div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {formatDistance(place.distance)}
                    </div>
                  </div>
                  <div className="mt-3 text-slate-600">{place.info}</div>
                  <div className="mt-3">
                    <OpenBadge status={status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{place.address}</div>
                </button>
              )})
            )}
          </div>
        </div>
      )}

      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl md:left-auto md:right-4">
          <PlaceDetails
            key={selectedPlace.name}
            place={selectedPlace}
            status={placeStatuses.get(selectedPlace.name) ?? getOpenStatus(selectedPlace, now)}
            distance={selectedPlaceDistance}
            onClose={() => setSelectedPlaceName(null)}
          />
        </div>
      )}
    </div>
  );
}
