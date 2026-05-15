"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MateReportStatus, OpeningInterval, Place } from "@/data/placeTypes";

type AdminPlaceForm = {
  name: string;
  type: Place["type"];
  latitude: string;
  longitude: string;
  info: string;
  address: string;
  dayHours: string[];
};

type PlaceSuggestion = {
  placeId?: string;
  placeResourceName?: string;
  label: string;
  name: string;
  type?: Place["type"];
  latitude?: number;
  longitude?: number;
};

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

const mapTilerAquarelleUrl =
  "https://api.maptiler.com/maps/aquarelle-v4/256/{z}/{x}/{y}.png?key=rtNRwNDetFusrDDFDwMR";
const mapTilerAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a>';
const cartoLabelsOnlyUrl = "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png";
const cartoLabelsAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const filterOptions = [
  { value: "all", label: "Alles", widthClass: "w-[100px] sm:w-[104px]" },
  { value: "cafe", label: "Cafés", widthClass: "w-[114px] sm:w-[120px]" },
  { value: "shop", label: "Supermarkten", widthClass: "w-[170px] sm:w-[182px]" },
];

const accentButtonClass =
  "rounded-full border border-[rgba(236,0,0,1)] bg-[rgba(247,194,0,1)] text-[#193882] shadow-sm transition hover:bg-[#dbb323]";
const accentButtonActiveClass =
  "rounded-full border-3 border-[rgba(236,0,0,1)] bg-[rgba(247,194,0,1)] text-[#193882] shadow-sm transition";
const accentIconButtonClass =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(236,0,0,1)] bg-[rgba(247,194,0,1)] text-[#193882] transition hover:bg-[#dbb323]";
const notableHomeButtonClass =
  "font-notable whitespace-nowrap text-center text-[13px] leading-[1.1] tracking-[0.05em] sm:text-[14px]";

const defaultPlaceDetails: Record<string, Pick<Place, "address" | "hours">> = {
  korsakov: {
    address: "Sint-Jorispoort 1, 2000 Antwerpen",
    hours: [
      [{ open: "12:00", close: "02:00" }],
      [{ open: "12:00", close: "02:00" }],
      [{ open: "12:00", close: "03:00" }],
      [{ open: "12:00", close: "03:00" }],
      [{ open: "12:00", close: "03:00" }],
      [{ open: "12:00", close: "04:00" }],
      [{ open: "12:00", close: "04:00" }],
    ],
  },
  ampere: {
    address: "Simonsstraat 21, 2018 Antwerpen",
    hours: [
      [],
      [],
      [],
      [],
      [],
      [{ open: "23:00", close: "07:00" }],
      [{ open: "23:00", close: "07:00" }],
    ],
  },
  carrefour: {
    address: "Beddenstraat 2, 2000 Antwerpen",
    hours: [
      [],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "21:00" }],
      [{ open: "08:00", close: "20:00" }],
    ],
  },
};

const dayLabels = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const shortDayLabels = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const displayDayOrder = [1, 2, 3, 4, 5, 6, 0];
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

type MateReport = {
  lastStatus?: MateReportStatus;
  lastReportedAt?: string;
  presentCount: number;
  absentCount: number;
};

type MateReports = Record<string, MateReport>;

type PendingMateReport = {
  placeName: string;
  status: MateReportStatus;
};

type SuggestionDetails = {
  hours?: OpeningInterval[][];
  rawOpeningHours?: string | null;
  address?: string | null;
  name?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type?: Place["type"];
};

type SpotForm = {
  name: string;
  address: string;
  info: string;
  latitude: number | null;
  longitude: number | null;
  type: Place["type"];
  hours: OpeningInterval[][];
  placeId?: string;
};

const mateReportsStorageKey = "clubmate-map-reports";
const adminSessionStorageKey = "clubmate-map-admin-unlocked";
const adminSessionPasscodeKey = "clubmate-map-admin-code";

const normalizeType = (value: unknown) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

const createEmptyHours = () => Array.from({ length: 7 }, () => "");
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2).toString().padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

const createEmptyAdminForm = (): AdminPlaceForm => ({
  name: "",
  type: "cafe",
  latitude: "",
  longitude: "",
  info: "Club Mate verkrijgbaar",
  address: "",
  dayHours: createEmptyHours(),
});

const createEmptySpotForm = (): SpotForm => ({
  name: "",
  address: "",
  info: "",
  latitude: null,
  longitude: null,
  type: "shop",
  hours: Array.from({ length: 7 }, () => [] as OpeningInterval[]),
  placeId: undefined,
});

const formatHoursForAdmin = (hours: Place["hours"]) =>
  shortDayLabels.map((_, index) => {
    const intervals = hours?.[index] ?? [];
    return intervals.map((interval) => `${interval.open}-${interval.close}`).join(", ");
  });

const createAdminFormFromPlace = (place: Place): AdminPlaceForm => ({
  name: place.name,
  type: place.type,
  latitude: String(place.position[0]),
  longitude: String(place.position[1]),
  info: place.info,
  address: place.address ?? "",
  dayHours: formatHoursForAdmin(place.hours),
});

const parseAdminDayHours = (value: string): OpeningInterval[] | null => {
  const trimmedValue = value.trim();

  if (!trimmedValue || normalizeType(trimmedValue) === "gesloten") {
    return [];
  }

  const intervals = trimmedValue.split(",").map((part) => part.trim()).filter(Boolean);
  const parsedIntervals = intervals.map((interval) => {
    const match = interval.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
    return match ? { open: match[1], close: match[2] } : null;
  });

  if (parsedIntervals.some((interval) => interval === null)) {
    return null;
  }

  return parsedIntervals as OpeningInterval[];
};

const parseAdminHours = (values: string[]) => {
  const parsedHours = values.map(parseAdminDayHours);

  if (parsedHours.some((hours) => hours === null)) {
    return null;
  }

  return parsedHours as OpeningInterval[][];
};

const getAdminDayHoursValue = (value: string) => {
  const match = value.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);

  return {
    isOpen: Boolean(match),
    open: match?.[1] ?? "09:00",
    close: match?.[2] ?? "18:00",
  };
};

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
  if (!place.hours?.length) {
    return {
      isOpen: false,
      label: "Openingsuren onbekend",
    };
  }

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

const formatHours = (hours: Place["hours"], todayIndex: number) =>
  displayDayOrder.map((index) => {
    const intervals = hours?.[index] ?? [];

    return {
      key: shortDayLabels[index],
      day: dayLabels[index],
      shortDay: shortDayLabels[index],
      isToday: index === todayIndex,
      value: intervals.length === 0
        ? "Gesloten"
        : intervals.map((interval) => `${interval.open} - ${interval.close}`).join(", "),
    };
  });

const typeLabel = (type: Place["type"]) => (type === "cafe" ? "Café" : "Supermarkt");

const reportStatusLabel = (status: MateReportStatus) =>
  status === "present" ? "Club Mate aanwezig" : "Niet meer aanwezig";

const isMateReportStatus = (value: unknown): value is MateReportStatus =>
  value === "present" || value === "absent";

const normalizeReportCount = (value: unknown) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const normalizeMateReport = (value: unknown): MateReport | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const report = value as Partial<MateReport> & {
    status?: unknown;
    reportedAt?: unknown;
  };
  const oldStatus = isMateReportStatus(report.status) ? report.status : undefined;
  const lastStatus = isMateReportStatus(report.lastStatus) ? report.lastStatus : oldStatus;
  const lastReportedAt =
    typeof report.lastReportedAt === "string"
      ? report.lastReportedAt
      : typeof report.reportedAt === "string"
        ? report.reportedAt
        : undefined;
  const presentCount = normalizeReportCount(report.presentCount) + (oldStatus === "present" ? 1 : 0);
  const absentCount = normalizeReportCount(report.absentCount) + (oldStatus === "absent" ? 1 : 0);

  if (!lastStatus && presentCount === 0 && absentCount === 0) {
    return undefined;
  }

  return {
    lastStatus,
    lastReportedAt,
    presentCount,
    absentCount,
  };
};

const getMateReportFromPlace = (place?: Place | null): MateReport | undefined => {
  if (!place) {
    return undefined;
  }

  const presentCount = normalizeReportCount(place.presentCount);
  const absentCount = normalizeReportCount(place.absentCount);

  if (!place.lastReportStatus && !place.lastReportedAt && presentCount === 0 && absentCount === 0) {
    return undefined;
  }

  return {
    lastStatus: place.lastReportStatus,
    lastReportedAt: place.lastReportedAt,
    presentCount,
    absentCount,
  };
};

const formatReportDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "onbekend";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: placeTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

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
  mateReport,
  onMateReport,
  onClose,
  todayIndex,
}: {
  place: Place;
  status: OpenStatus;
  distance?: number;
  mateReport?: MateReport;
  onMateReport: (placeName: string, status: MateReportStatus) => void;
  onClose?: () => void;
  todayIndex: number;
}) {
  const [hoursOpen, setHoursOpen] = useState(false);
  const formattedHours = formatHours(place.hours, todayIndex);

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-1 -mt-1 flex items-start justify-between gap-4 rounded-t-[1.75rem] bg-white px-1 pt-1">
        <div className="pr-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{typeLabel(place.type)}</div>
          <div className="text-xl font-semibold text-slate-950">{place.name}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className={`${accentIconButtonClass} sticky top-0 text-lg`}
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
        <div className="text-sm text-slate-800">{place.address ?? "Adres onbekend"}</div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Info</div>
        <div className="text-sm text-slate-800">{place.info}</div>
      </div>

      <div className="space-y-2 rounded-3xl border border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Club Mate voorraad</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={`${accentButtonClass} min-h-11 px-4 py-2 text-sm font-medium`}
            onClick={() => onMateReport(place.name, "present")}
          >
            Club Mate aanwezig
          </button>
          <button
            type="button"
            className={`${accentButtonClass} min-h-11 px-4 py-2 text-sm font-medium`}
            onClick={() => onMateReport(place.name, "absent")}
          >
            Niet meer aanwezig
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-slate-50 px-3 py-2 text-slate-700">
            Aanwezig gemeld: <span className="font-semibold">{mateReport?.presentCount ?? 0}</span>
          </div>
          <div className="rounded bg-slate-50 px-3 py-2 text-slate-700">
            Niet aanwezig: <span className="font-semibold">{mateReport?.absentCount ?? 0}</span>
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {mateReport?.lastStatus && mateReport.lastReportedAt
            ? `Laatst gemeld: ${reportStatusLabel(mateReport.lastStatus)} op ${formatReportDate(mateReport.lastReportedAt)}`
            : "Nog geen melding doorgegeven."}
        </div>
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
          className={`${accentButtonClass} flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide`}
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
          <div className="space-y-2">
            {formattedHours.length > 0 ? (
              formattedHours.map((item) => (
                <div
                  key={item.key}
                  className={`grid grid-cols-[minmax(4rem,auto)_1fr] items-center gap-3 rounded-2xl px-3 py-2 text-sm ${
                    item.isToday ? "bg-emerald-50 text-emerald-950" : "bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="font-medium capitalize">
                    {item.day}
                    {item.isToday ? " vandaag" : ""}
                  </div>
                  <div className="text-right">{item.value}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Geen openingsuren bekend.</div>
            )}
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

function MapViewportController({
  focusTarget,
}: {
  focusTarget: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    map.flyTo(focusTarget, Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.7,
    });
  }, [focusTarget, map]);

  return null;
}

function MapInteractionController({
  onMapClick,
}: {
  onMapClick: () => void;
}) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });

  return null;
}

function MiniMapPreview({
  position,
}: {
  position: [number, number];
}) {
  const [latitude, longitude] = position;
  const offset = 0.0045;
  const bbox = [
    longitude - offset,
    latitude - offset,
    longitude + offset,
    latitude + offset,
  ].join(",");
  const previewUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=cartodbpositron&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-sm">
      <iframe
        title="Locatievoorbeeld op kaart"
        src={previewUrl}
        className="block h-44 w-full bg-slate-100"
        loading="lazy"
      />
    </div>
  );
}

export default function MapClient({ places }: { places: Place[] }) {
  const [filter, setFilter] = useState("all");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [databasePlaces, setDatabasePlaces] = useState<Place[]>(() => Array.isArray(places) ? places : []);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [adminPasscode, setAdminPasscode] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.sessionStorage.getItem(adminSessionPasscodeKey) ?? "";
  });
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(adminSessionStorageKey) === "true"
      && Boolean(window.sessionStorage.getItem(adminSessionPasscodeKey));
  });
  const [editingPlaceName, setEditingPlaceName] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState<AdminPlaceForm>(() => createEmptyAdminForm());
  const [quickHoursScope, setQuickHoursScope] = useState<"all" | "weekdays" | "weekend">("weekdays");
  const [quickHoursOpen, setQuickHoursOpen] = useState("09:00");
  const [quickHoursClose, setQuickHoursClose] = useState("18:00");
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = useState(false);
  const [addressSuggestionMessage, setAddressSuggestionMessage] = useState<string | null>(null);
  const [addressSuggestionSelected, setAddressSuggestionSelected] = useState(false);
  const [spotFormOpen, setSpotFormOpen] = useState(false);
  const [spotForm, setSpotForm] = useState<SpotForm>(() => createEmptySpotForm());
  const [spotSuggestions, setSpotSuggestions] = useState<PlaceSuggestion[]>([]);
  const [spotSuggestionMessage, setSpotSuggestionMessage] = useState<string | null>(null);
  const [isLoadingSpotSuggestions, setIsLoadingSpotSuggestions] = useState(false);
  const [spotSuggestionSelected, setSpotSuggestionSelected] = useState(false);
  const [spotFormMessage, setSpotFormMessage] = useState<string | null>(null);
  const [isSubmittingSpot, setIsSubmittingSpot] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [pendingMateReport, setPendingMateReport] = useState<PendingMateReport | null>(null);
  const [localMateReports, setLocalMateReports] = useState<MateReports>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const storedReports = window.localStorage.getItem(mateReportsStorageKey);

      if (!storedReports) {
        return {};
      }

      const parsedReports = JSON.parse(storedReports);

      if (!parsedReports || typeof parsedReports !== "object") {
        return {};
      }

      return Object.fromEntries(
        Object.entries(parsedReports).flatMap(([placeKey, report]) => {
          const normalizedReport = normalizeMateReport(report);
          return normalizedReport ? [[placeKey, normalizedReport]] : [];
        }),
      );
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/places", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.places)) {
          setDatabasePlaces(data.places);
        }
      })
      .catch(() => {
        // The server-rendered list stays visible if a refresh fails.
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFocusTarget(null);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [focusTarget]);

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

  useEffect(() => {
    const query = adminForm.address.trim();

    if (!adminPanelOpen || !isAdminUnlocked || addressSuggestionSelected || query.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoadingAddressSuggestions(true);

      fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const contentType = response.headers.get("content-type") ?? "";

          if (!contentType.includes("application/json")) {
            throw new Error("NO_JSON");
          }

          return response.json();
        })
        .then((data) => {
          setAddressSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setAddressSuggestionMessage(data.error ?? null);
        })
        .catch((error) => {
          if (error?.name !== "AbortError") {
            setAddressSuggestions([]);
            setAddressSuggestionMessage(
              error?.message === "NO_JSON"
                ? "Suggestie-route niet gevonden. Redeploy de laatste versie op Vercel."
                : "Suggesties ophalen is mislukt. Controleer je Geoapify key en redeploy.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingAddressSuggestions(false);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [adminForm.address, adminPanelOpen, isAdminUnlocked, addressSuggestionSelected]);

  useEffect(() => {
    const query = spotForm.name.trim();

    if (!spotFormOpen || spotSuggestionSelected || query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoadingSpotSuggestions(true);

      fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const contentType = response.headers.get("content-type") ?? "";

          if (!contentType.includes("application/json")) {
            throw new Error("NO_JSON");
          }

          return response.json();
        })
        .then((data) => {
          setSpotSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setSpotSuggestionMessage(data.error ?? null);
        })
        .catch((error) => {
          if (error?.name !== "AbortError") {
            setSpotSuggestions([]);
            setSpotSuggestionMessage(
              error?.message === "NO_JSON"
                ? "Suggesties konden niet geladen worden."
                : "Zoeken naar locaties is mislukt.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingSpotSuggestions(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [spotForm.name, spotFormOpen, spotSuggestionSelected]);

  const shouldShowAddressSuggestions =
    adminPanelOpen && isAdminUnlocked && !addressSuggestionSelected && adminForm.address.trim().length >= 3;
  const shouldShowSpotSuggestions =
    spotFormOpen && !spotSuggestionSelected && spotForm.name.trim().length >= 2;

  const safePlaces = useMemo(
    () =>
      databasePlaces.map((place) => ({
        ...defaultPlaceDetails[normalizeType(place.name)],
        ...place,
        address: place.address ?? defaultPlaceDetails[normalizeType(place.name)]?.address,
        hours: place.hours ?? defaultPlaceDetails[normalizeType(place.name)]?.hours,
      })),
    [databasePlaces],
  );
  const todayIndex = useMemo(() => getBrusselsTimeParts(now).dayIndex, [now]);
  const normalizedFilter = useMemo(() => normalizeType(filter), [filter]);
  const placeStatuses = useMemo(
    () => new Map(safePlaces.map((place) => [place.name, getOpenStatus(place, now)])),
    [safePlaces, now],
  );

  const filteredPlaces = useMemo(() => {
    const placesByType = normalizedFilter === "all"
      ? safePlaces
      : safePlaces.filter((place) => normalizeType(place.type) === normalizedFilter);

    if (!openNowOnly) {
      return placesByType;
    }

    return placesByType.filter((place) => placeStatuses.get(place.name)?.isOpen);
  }, [safePlaces, normalizedFilter, openNowOnly, placeStatuses]);

  const visiblePlaces = filteredPlaces;

  const listPlaces = useMemo(() => {
    return filteredPlaces
      .map((place) => ({
        ...place,
        distance: userLocation ? getDistanceKm(userLocation, place.position) : undefined,
      }))
      .sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
  }, [filteredPlaces, userLocation]);

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
    setSpotFormOpen(false);
    setViewMode(mode);
  };

  const selectFilter = (value: string) => {
    setSelectedPlaceName(null);
    setSpotFormOpen(false);
    setFilter(value);
  };

  const toggleOpenNowOnly = () => {
    setSelectedPlaceName(null);
    setSpotFormOpen(false);
    setOpenNowOnly((currentValue) => !currentValue);
  };

  const lockAdmin = (message = "Je beheersessie is verlopen. Vul je code opnieuw in.") => {
    setIsAdminUnlocked(false);
    setAdminPasscode("");
    setAdminPasscodeInput("");
    setAdminError(message);
    window.sessionStorage.removeItem(adminSessionStorageKey);
    window.sessionStorage.removeItem(adminSessionPasscodeKey);
  };

  const unlockAdmin = async () => {
    const pin = adminPasscodeInput.trim();

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setAdminError(data?.error ?? "Code klopt niet.");
        return;
      }

      setIsAdminUnlocked(true);
      setAdminPasscode(pin);
      setAdminError(null);
      setAdminPasscodeInput("");
      window.sessionStorage.setItem(adminSessionStorageKey, "true");
      window.sessionStorage.setItem(adminSessionPasscodeKey, pin);
    } catch {
      setAdminError("Beheer ontgrendelen is mislukt.");
    }
  };

  const closeSpotForm = () => {
    setSpotFormOpen(false);
    setSpotSuggestions([]);
    setSpotSuggestionMessage(null);
    setSpotFormMessage(null);
    setSpotSuggestionSelected(false);
    setFocusTarget(null);
  };

  const openSpotForm = () => {
    setSelectedPlaceName(null);
    setAdminPanelOpen(false);
    setSpotForm(createEmptySpotForm());
    setSpotSuggestions([]);
    setSpotSuggestionMessage(null);
    setSpotFormMessage(null);
    setSpotSuggestionSelected(false);
    setSpotFormOpen(true);
  };

  const fetchSuggestionDetails = async (placeId?: string, placeResourceName?: string): Promise<SuggestionDetails | null> => {
    if (!placeId && !placeResourceName) {
      return null;
    }

    const params = new URLSearchParams();

    if (placeId) {
      params.set("id", placeId);
    }

    if (placeResourceName) {
      params.set("place", placeResourceName);
    }

    const response = await fetch(`/api/geocode/place-details?${params.toString()}`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return null;
    }

    return data as SuggestionDetails | null;
  };

  const startAddingPlace = () => {
    setEditingPlaceName(null);
    setAdminForm(createEmptyAdminForm());
    setAddressSuggestionSelected(false);
    setAddressSuggestions([]);
    setAddressSuggestionMessage(null);
    setSpotFormOpen(false);
  };

  const startEditingPlace = (place: Place) => {
    setEditingPlaceName(place.name);
    setAdminForm(createAdminFormFromPlace(place));
    setAddressSuggestionSelected(true);
    setAddressSuggestions([]);
    setAddressSuggestionMessage(null);
  };

  const selectAddressSuggestion = async (suggestion: PlaceSuggestion) => {
    const details = await fetchSuggestionDetails(suggestion.placeId, suggestion.placeResourceName);
    const latitude = details?.latitude ?? suggestion.latitude;
    const longitude = details?.longitude ?? suggestion.longitude;

    if (latitude == null || longitude == null) {
      setAdminError("Locatiegegevens ontbreken voor deze suggestie.");
      return;
    }

    setAdminForm((form) => ({
      ...form,
      name: form.name || details?.name || suggestion.name,
      type: details?.type ?? suggestion.type ?? form.type,
      address: details?.address || suggestion.label,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      dayHours: formatHoursForAdmin(details?.hours),
    }));
    setAddressSuggestions([]);
    setAddressSuggestionMessage(null);
    setAddressSuggestionSelected(true);
    setAdminError("Adres gekozen.");
    setViewMode("map");
  };

  const updateAdminDayOpenStatus = (index: number, isOpen: boolean) => {
    setAdminForm((currentForm) => ({
      ...currentForm,
      dayHours: currentForm.dayHours.map((dayValue, dayIndex) => {
        if (dayIndex !== index) {
          return dayValue;
        }

        if (!isOpen) {
          return "";
        }

        const dayHours = getAdminDayHoursValue(dayValue);
        return `${dayHours.open}-${dayHours.close}`;
      }),
    }));
  };

  const updateAdminDayTime = (index: number, field: "open" | "close", value: string) => {
    setAdminForm((currentForm) => ({
      ...currentForm,
      dayHours: currentForm.dayHours.map((dayValue, dayIndex) => {
        if (dayIndex !== index) {
          return dayValue;
        }

        const dayHours = getAdminDayHoursValue(dayValue);
        return field === "open" ? `${value}-${dayHours.close}` : `${dayHours.open}-${value}`;
      }),
    }));
  };

  const getQuickHoursIndexes = (scope: typeof quickHoursScope) => {
    if (scope === "weekdays") return [1, 2, 3, 4, 5];
    if (scope === "weekend") return [0, 6];
    return [0, 1, 2, 3, 4, 5, 6];
  };

  const applyQuickHours = () => {
    const selectedIndexes = new Set(getQuickHoursIndexes(quickHoursScope));

    setAdminForm((currentForm) => ({
      ...currentForm,
      dayHours: currentForm.dayHours.map((value, index) =>
        selectedIndexes.has(index) ? `${quickHoursOpen}-${quickHoursClose}` : value,
      ),
    }));
  };

  const closeQuickHours = () => {
    const selectedIndexes = new Set(getQuickHoursIndexes(quickHoursScope));

    setAdminForm((currentForm) => ({
      ...currentForm,
      dayHours: currentForm.dayHours.map((value, index) => selectedIndexes.has(index) ? "" : value),
    }));
  };

  const updatePlaceInState = (updatedPlace: Place, fallbackName?: string) => {
    setDatabasePlaces((currentPlaces) => {
      const updatedKey = normalizeType(fallbackName ?? updatedPlace.name);
      const existingIndex = currentPlaces.findIndex((place) =>
        (updatedPlace.id && place.id === updatedPlace.id) || normalizeType(place.name) === updatedKey,
      );

      if (existingIndex < 0) {
        return [...currentPlaces, updatedPlace].sort((a, b) => a.name.localeCompare(b.name));
      }

      return currentPlaces.map((place, index) => index === existingIndex ? updatedPlace : place);
    });
  };

  const saveAdminPlace = async () => {
    const latitude = Number(adminForm.latitude);
    const longitude = Number(adminForm.longitude);
    const parsedHours = parseAdminHours(adminForm.dayHours);
    const editingPlace = safePlaces.find((place) => normalizeType(place.name) === normalizeType(editingPlaceName));

    if (!adminForm.name.trim()) {
      setAdminError("Naam is verplicht.");
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setAdminError("Latitude en longitude moeten geldige nummers zijn.");
      return;
    }

    if (!parsedHours) {
      setAdminError("Gebruik openingsuren zoals 12:00-18:00, of laat leeg voor gesloten.");
      return;
    }

    const nextPlace: Place = {
      id: editingPlace?.id,
      name: adminForm.name.trim(),
      type: adminForm.type,
      position: [latitude, longitude],
      info: adminForm.info.trim() || "Club Mate verkrijgbaar",
      address: adminForm.address.trim(),
      hours: parsedHours,
      presentCount: editingPlace?.presentCount ?? 0,
      absentCount: editingPlace?.absentCount ?? 0,
      lastReportStatus: editingPlace?.lastReportStatus,
      lastReportedAt: editingPlace?.lastReportedAt,
    };

    try {
      const response = await fetch("/api/admin/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPasscode,
        },
        body: JSON.stringify({
          place: nextPlace,
          previousName: editingPlaceName,
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        lockAdmin();
        return;
      }

      if (!response.ok || !data?.place) {
        setAdminError(data?.error ?? "Locatie opslaan is mislukt.");
        return;
      }

      updatePlaceInState(data.place, editingPlaceName ?? nextPlace.name);
      setSelectedPlaceName(data.place.name);
      setEditingPlaceName(data.place.name);
      setAdminForm(createAdminFormFromPlace(data.place));
      setAdminError("Locatie opgeslagen.");
      setAdminPanelOpen(false);
    } catch {
      setAdminError("Locatie opslaan is mislukt.");
    }
  };

  const selectSpotSuggestion = async (suggestion: PlaceSuggestion) => {
    const details = await fetchSuggestionDetails(suggestion.placeId, suggestion.placeResourceName);
    const latitude = details?.latitude ?? suggestion.latitude;
    const longitude = details?.longitude ?? suggestion.longitude;

    if (latitude == null || longitude == null) {
      setSpotFormMessage("Locatiegegevens ontbreken voor deze suggestie.");
      return;
    }

    setSpotForm({
      name: details?.name || suggestion.name,
      address: details?.address || suggestion.label,
      info: "",
      latitude,
      longitude,
      type: details?.type ?? suggestion.type ?? "shop",
      hours: details?.hours ?? Array.from({ length: 7 }, () => [] as OpeningInterval[]),
      placeId: suggestion.placeId,
    });
    setSpotSuggestions([]);
    setSpotSuggestionMessage(null);
    setSpotSuggestionSelected(true);
    setSpotFormMessage("Locatie gekozen. Controleer gerust nog even op de kaart.");
    setSelectedPlaceName(null);
    setViewMode("map");
  };

  const submitSpotForm = async () => {
    if (!spotForm.name.trim() || spotForm.latitude == null || spotForm.longitude == null) {
      setSpotFormMessage("Kies eerst een locatie uit de suggesties.");
      return;
    }

    setIsSubmittingSpot(true);

    try {
      const response = await fetch("/api/places/spot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: spotForm.name,
          address: spotForm.address,
          latitude: spotForm.latitude,
          longitude: spotForm.longitude,
          type: spotForm.type,
          hours: spotForm.hours,
          info: spotForm.info,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.place) {
        setSpotFormMessage(data?.error ?? "Locatie toevoegen is mislukt.");
        return;
      }

      updatePlaceInState(data.place, spotForm.name);
      setSelectedPlaceName(data.place.name);
      setFocusTarget(data.place.position);
      closeSpotForm();
    } catch {
      setSpotFormMessage("Locatie toevoegen is mislukt.");
    } finally {
      setIsSubmittingSpot(false);
    }
  };

  const updateLocalMateReport = (placeName: string, updater: (report: MateReport) => MateReport) => {
    const placeKey = normalizeType(placeName);
    const existingReport = normalizeMateReport(localMateReports[placeKey]) ?? {
      presentCount: 0,
      absentCount: 0,
    };
    const nextReports = {
      ...localMateReports,
      [placeKey]: updater(existingReport),
    };

    setLocalMateReports(nextReports);

    try {
      window.localStorage.setItem(mateReportsStorageKey, JSON.stringify(nextReports));
    } catch {
      // The UI should still update even when storage is blocked.
    }
  };

  const getMateReport = (placeName: string) => {
    const place = safePlaces.find((candidatePlace) => normalizeType(candidatePlace.name) === normalizeType(placeName));
    return getMateReportFromPlace(place) ?? localMateReports[normalizeType(placeName)];
  };

  const reportMateStatus = async (placeName: string, status: MateReportStatus) => {
    const place = safePlaces.find((candidatePlace) => normalizeType(candidatePlace.name) === normalizeType(placeName));

    if (!place) {
      return;
    }

    try {
      const response = await fetch("/api/places/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ place, status }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.place) {
        throw new Error("REPORT_FAILED");
      }

      updatePlaceInState(data.place, place.name);
    } catch {
      updateLocalMateReport(placeName, (existingReport) => ({
        ...existingReport,
        lastStatus: status,
        lastReportedAt: new Date().toISOString(),
        presentCount: existingReport.presentCount + (status === "present" ? 1 : 0),
        absentCount: existingReport.absentCount + (status === "absent" ? 1 : 0),
      }));
    }
  };

  const updateMateReportCounts = async (placeName: string, presentCount: number, absentCount: number) => {
    const place = safePlaces.find((candidatePlace) => normalizeType(candidatePlace.name) === normalizeType(placeName));

    if (!place) {
      return;
    }

    try {
      const response = await fetch("/api/admin/places", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPasscode,
        },
        body: JSON.stringify({ place, presentCount, absentCount }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        lockAdmin();
        return;
      }

      if (!response.ok || !data?.place) {
        setAdminError(data?.error ?? "Tellers aanpassen is mislukt.");
        return;
      }

      updatePlaceInState(data.place, place.name);
      setAdminError("Tellers aangepast.");
    } catch {
      setAdminError("Tellers aanpassen is mislukt.");
    }
  };

  const confirmPendingMateReport = async () => {
    if (!pendingMateReport) {
      return;
    }

    await reportMateStatus(pendingMateReport.placeName, pendingMateReport.status);
    setPendingMateReport(null);
  };

  const showFloatingUi = !adminPanelOpen && !spotFormOpen;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-100">
      {showFloatingUi && (
        <div className="absolute left-3 right-3 top-3 z-[1000] flex flex-wrap justify-center gap-2 rounded-[1.75rem] border border-[#c91e15] bg-[#ecd2aa] p-2.5 shadow-lg backdrop-blur sm:left-4 sm:right-auto sm:top-4 sm:justify-start sm:p-3">
        <button
          type="button"
          className={`${notableHomeButtonClass} ${viewMode === "map" ? accentButtonActiveClass : accentButtonClass} min-h-[42px] w-[104px] px-3 py-2 sm:min-h-[40px] sm:w-[110px] sm:py-2`}
          onClick={() => selectViewMode("map")}
        >
          Kaart
        </button>
        <button
          type="button"
          className={`${notableHomeButtonClass} ${viewMode === "list" ? accentButtonActiveClass : accentButtonClass} min-h-[42px] w-[104px] px-3 py-2 sm:min-h-[40px] sm:w-[110px] sm:py-2`}
          onClick={() => selectViewMode("list")}
        >
          Lijst
        </button>
        <button
          type="button"
          className={`${adminPanelOpen ? accentButtonActiveClass : accentButtonClass} flex min-h-[42px] w-[52px] items-center justify-center px-0 py-2 text-[22px] leading-none sm:min-h-[40px] sm:w-[52px] sm:py-2`}
          onClick={() => {
            setSelectedPlaceName(null);
            setSpotFormOpen(false);
            setAdminPanelOpen((isOpen) => !isOpen);
          }}
          aria-label="Beheer"
          title="Beheer"
        >
          ⚙
        </button>
        </div>
      )}

      {showFloatingUi && (
        <div className="absolute left-3 right-3 top-[5.25rem] z-[1000] flex flex-col gap-2 rounded-[1.75rem] border border-[#c91e15] bg-[#ecd2aa] p-2.5 shadow-lg backdrop-blur sm:left-auto sm:right-4 sm:top-4 sm:w-auto sm:min-w-[15rem] sm:p-3">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${notableHomeButtonClass} ${option.widthClass} ${filter === option.value ? accentButtonActiveClass : accentButtonClass} min-h-[44px] px-3 py-2 sm:min-h-[40px] sm:px-3 sm:py-2`}
              onClick={() => selectFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${notableHomeButtonClass} ${openNowOnly ? `${accentButtonActiveClass} border-emerald-500` : accentButtonClass} flex min-h-[44px] w-[152px] items-center justify-center gap-2 self-center px-3 py-2 sm:min-h-[40px] sm:w-[160px] sm:self-start sm:py-2`}
          onClick={toggleOpenNowOnly}
          aria-pressed={openNowOnly}
        >
          <span
            className={`h-2 w-2 rounded-full ${openNowOnly ? "bg-emerald-500" : "bg-[rgba(236,0,0,0.55)]"}`}
            aria-hidden="true"
          />
          Nu open
        </button>
        </div>
      )}

      {adminPanelOpen && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" onClick={() => setAdminPanelOpen(false)}>
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Beheer</div>
              <div className="text-xl font-semibold text-slate-950">Locaties aanpassen</div>
            </div>
            <button
              type="button"
              className={accentIconButtonClass}
              onClick={() => setAdminPanelOpen(false)}
              aria-label="Sluit beheer"
            >
              ×
            </button>
          </div>

          {!isAdminUnlocked ? (
            <div className="space-y-4 p-4 sm:p-6">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Beheer-code</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                  value={adminPasscodeInput}
                  onChange={(event) => setAdminPasscodeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      unlockAdmin();
                    }
                  }}
                />
              </label>
              {adminError && <div className="text-sm text-rose-600">{adminError}</div>}
              <button
                type="button"
                className={`${accentButtonClass} min-h-11 px-5 py-3 text-sm font-medium`}
                onClick={unlockAdmin}
              >
                Ontgrendel beheer
              </button>
            </div>
          ) : (
            <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[20rem_1fr]">
              <div className="overflow-auto border-b border-slate-100 p-4 lg:border-b-0 lg:border-r lg:p-5">
                <div className="space-y-3">
                <button
                  type="button"
                  className={`${accentButtonClass} min-h-11 w-full px-4 py-3 text-sm font-medium`}
                  onClick={startAddingPlace}
                >
                  Nieuwe locatie
                </button>
                <div className="space-y-2">
                  {safePlaces.map((place) => (
                    <button
                      key={place.name}
                      type="button"
                      className={`min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        normalizeType(editingPlaceName) === normalizeType(place.name)
                          ? "border-[rgba(236,0,0,1)] bg-[rgba(235,150,49,1)] text-[rgba(236,0,0,1)] ring-2 ring-[rgba(236,0,0,0.15)]"
                          : "border-[rgba(236,0,0,1)] bg-[rgba(247,194,0,1)] text-[rgba(236,0,0,1)] hover:bg-[rgba(235,150,49,1)]"
                      }`}
                      onClick={() => startEditingPlace(place)}
                    >
                      <span className="block font-medium">{place.name}</span>
                      <span className="text-xs text-slate-500">{typeLabel(place.type)}</span>
                    </button>
                  ))}
                </div>
              </div>
              </div>

              <form
                className="space-y-4 overflow-auto p-4 sm:p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveAdminPlace();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Naam</span>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                      value={adminForm.name}
                      onChange={(event) => setAdminForm((form) => ({ ...form, name: event.target.value }))}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Type</span>
                    <select
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                      value={adminForm.type}
                      onChange={(event) => setAdminForm((form) => ({ ...form, type: event.target.value as Place["type"] }))}
                    >
                      <option value="cafe">Café</option>
                      <option value="shop">Supermarkt</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Locatie zoeken</span>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                    value={adminForm.address}
                    onChange={(event) => {
                      setAdminForm((form) => ({ ...form, address: event.target.value }));
                      setAdminError(null);
                      setAddressSuggestionMessage(null);
                      setAddressSuggestionSelected(false);
                    }}
                  />
                </label>

                {shouldShowAddressSuggestions && (isLoadingAddressSuggestions || addressSuggestions.length > 0 || addressSuggestionMessage) && (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    {isLoadingAddressSuggestions && (
                      <div className="px-4 py-3 text-sm text-slate-500">Suggesties zoeken...</div>
                    )}
                    {!isLoadingAddressSuggestions && addressSuggestionMessage && addressSuggestions.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">{addressSuggestionMessage}</div>
                    )}
                    {addressSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.placeId ?? suggestion.label}-${suggestion.latitude}-${suggestion.longitude}`}
                        type="button"
                        className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition first:border-t-0 hover:bg-slate-50"
                        onClick={() => selectAddressSuggestion(suggestion)}
                      >
                        <span className="block font-medium">{suggestion.name}</span>
                        <span className="block text-xs text-slate-500">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {addressSuggestionSelected && adminForm.latitude && adminForm.longitude && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">Gekozen locatie</div>
                    <MiniMapPreview
                      position={[Number(adminForm.latitude), Number(adminForm.longitude)]}
                    />
                  </div>
                )}

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Info</span>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                    value={adminForm.info}
                    onChange={(event) => setAdminForm((form) => ({ ...form, info: event.target.value }))}
                  />
                </label>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">Openingsuren</div>
                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Snel instellen</div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dagen</span>
                        <select
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                          value={quickHoursScope}
                          onChange={(event) => setQuickHoursScope(event.target.value as typeof quickHoursScope)}
                        >
                          <option value="all">Alle dagen</option>
                          <option value="weekdays">Ma-vr</option>
                          <option value="weekend">Weekend</option>
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Van</span>
                        <select
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                          value={quickHoursOpen}
                          onChange={(event) => setQuickHoursOpen(event.target.value)}
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tot</span>
                        <select
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                          value={quickHoursClose}
                          onChange={(event) => setQuickHoursClose(event.target.value)}
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className={`${accentButtonClass} min-h-11 px-4 py-3 text-sm font-medium`}
                        onClick={applyQuickHours}
                      >
                        Toepassen
                      </button>
                      <button
                        type="button"
                        className={`${accentButtonClass} min-h-11 px-4 py-3 text-sm font-medium`}
                        onClick={closeQuickHours}
                      >
                        Gesloten
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`${accentButtonClass} min-h-10 w-full px-4 py-3 text-sm font-medium sm:w-auto`}
                      onClick={() => setAdminForm((form) => ({ ...form, dayHours: createEmptyHours() }))}
                    >
                      Alles leegmaken
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {displayDayOrder.map((index) => {
                      const dayHours = getAdminDayHoursValue(adminForm.dayHours[index]);
                      const day = dayLabels[index];

                      return (
                        <div key={day} className="grid gap-2 rounded-3xl border border-slate-200 p-4 sm:grid-cols-[7rem_1fr_1fr_1fr] sm:items-end">
                          <div className="text-sm font-medium capitalize text-slate-700 sm:pb-2">{day}</div>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                            <select
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                              value={dayHours.isOpen ? "open" : "closed"}
                              onChange={(event) => updateAdminDayOpenStatus(index, event.target.value === "open")}
                            >
                              <option value="closed">Gesloten</option>
                              <option value="open">Open</option>
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Van</span>
                            <select
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                              value={dayHours.open}
                              disabled={!dayHours.isOpen}
                              onChange={(event) => updateAdminDayTime(index, "open", event.target.value)}
                            >
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tot</span>
                            <select
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                              value={dayHours.close}
                              disabled={!dayHours.isOpen}
                              onChange={(event) => updateAdminDayTime(index, "close", event.target.value)}
                            >
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {adminForm.name.trim() && (
                  <div className="space-y-3 rounded-3xl border border-slate-200 p-4">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Voorraadmeldingen</div>
                      <div className="text-xs text-slate-500">Pas deze tellers aan als er per ongeluk verkeerd gemeld is.</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aanwezig gemeld</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                          value={getMateReport(adminForm.name)?.presentCount ?? 0}
                          onChange={(event) => {
                            const currentReport = getMateReport(adminForm.name);
                            updateMateReportCounts(
                              adminForm.name,
                              Number(event.target.value),
                              currentReport?.absentCount ?? 0,
                            );
                          }}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Niet aanwezig gemeld</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                          value={getMateReport(adminForm.name)?.absentCount ?? 0}
                          onChange={(event) => {
                            const currentReport = getMateReport(adminForm.name);
                            updateMateReportCounts(
                              adminForm.name,
                              currentReport?.presentCount ?? 0,
                              Number(event.target.value),
                            );
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {adminError && (
                  <div className={`text-sm ${adminError === "Locatie opgeslagen." || adminError === "Tellers aangepast." || adminError === "Adres gekozen." ? "text-emerald-700" : "text-rose-600"}`}>
                    {adminError}
                  </div>
                )}

                <button
                  type="submit"
                  className={`${accentButtonClass} min-h-11 w-full px-5 py-3 text-sm font-medium sm:w-auto`}
                >
                  Locatie opslaan
                </button>
              </form>
	            </div>
	          )}
	        </div>
        </div>
	      )}

      {viewMode === "map" ? (
        <MapContainer center={[51.2194, 4.4025]} zoom={13} className="map-surface h-full w-full" zoomControl={false}>
        <MapViewportController focusTarget={focusTarget} />
        <MapInteractionController
          onMapClick={() => {
            setSelectedPlaceName(null);
          }}
        />
        <TileLayer
          attribution={mapTilerAttribution}
          url={mapTilerAquarelleUrl}
          keepBuffer={2}
        />
        <TileLayer
          attribution={cartoLabelsAttribution}
          url={cartoLabelsOnlyUrl}
          opacity={0.82}
          updateWhenZooming={false}
          keepBuffer={1}
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
          <Marker position={userLocation} icon={userIcon} />
        )}

      </MapContainer>
      ) : (
        <div className="absolute inset-0 overflow-auto bg-slate-50 p-3 pb-28 pt-36 sm:p-4 sm:pb-28 sm:pt-24">
          <div className="max-w-4xl mx-auto space-y-4">
            {listPlaces.length === 0 ? (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-center text-slate-600">
                Geen locaties gevonden voor deze filters.
              </div>
            ) : (
              listPlaces.map((place: PlaceWithDistance) => {
                const status = placeStatuses.get(place.name) ?? getOpenStatus(place, now);

                return (
                <button
                  key={place.name}
                  type="button"
                  className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 sm:p-5"
                  onClick={() => setSelectedPlaceName(place.name)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{place.name}</div>
                      <div className="text-sm text-slate-500">{typeLabel(place.type)}</div>
                    </div>
                    <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {formatDistance(place.distance)}
                    </div>
                  </div>
                  <div className="mt-3 text-slate-600">{place.info}</div>
                  <div className="mt-3">
                    <OpenBadge status={status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{place.address ?? "Adres onbekend"}</div>
                </button>
              )})
            )}
          </div>
        </div>
      )}

      {showFloatingUi && (
        <button
          type="button"
          className="font-notable absolute bottom-4 left-1/2 z-[1000] flex h-[52px] w-[min(92vw,360px)] -translate-x-1/2 items-center justify-center rounded-full border border-[#d8271d] bg-[rgba(247,194,0,1)] px-[18px] text-center text-[20px] leading-[20px] tracking-[0.06em] text-[#193882] shadow-lg transition hover:bg-[rgba(235,150,49,1)] sm:h-[48px] sm:w-[220px] sm:text-[22px] sm:leading-[22px]"
          onClick={openSpotForm}
        >
          <span className="relative top-[-2px]">Club Mate gespot!</span>
        </button>
      )}

      {spotFormOpen && (
        <div className="fixed inset-0 z-[1150] bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6" onClick={closeSpotForm}>
          <div
            className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nieuwe spot</div>
                <div className="text-xl font-semibold text-slate-950">Waar heb je Club Mate gezien?</div>
              </div>
              <button
                type="button"
                className={accentIconButtonClass}
                onClick={closeSpotForm}
                aria-label="Sluit formulier"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-6">
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Naam van café of winkel</span>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                    value={spotForm.name}
                    onChange={(event) => {
                      setSpotForm((currentForm) => ({
                        ...currentForm,
                        name: event.target.value,
                      }));
                      setSpotSuggestionSelected(false);
                      setSpotSuggestions([]);
                      setSpotSuggestionMessage(null);
                      setSpotFormMessage(null);
                    }}
                  />
                </label>

                {shouldShowSpotSuggestions && (isLoadingSpotSuggestions || spotSuggestions.length > 0 || spotSuggestionMessage) && (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    {isLoadingSpotSuggestions && (
                      <div className="px-4 py-3 text-sm text-slate-500">Suggesties zoeken...</div>
                    )}
                    {!isLoadingSpotSuggestions && spotSuggestionMessage && spotSuggestions.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">{spotSuggestionMessage}</div>
                    )}
                    {spotSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.placeId ?? suggestion.label}-${suggestion.latitude}-${suggestion.longitude}`}
                        type="button"
                        className="block w-full border-t border-[rgba(236,0,0,0.2)] bg-[rgba(247,194,0,0.45)] px-4 py-3 text-left text-sm text-[rgba(236,0,0,1)] transition first:border-t-0 hover:bg-[rgba(235,150,49,0.55)]"
                        onClick={() => selectSpotSuggestion(suggestion)}
                      >
                        <span className="block font-medium">{suggestion.name}</span>
                        <span className="block text-xs text-slate-500">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {spotForm.address && (
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{spotForm.name}</div>
                    <div className="mt-1">{spotForm.address}</div>
                  </div>
                )}

                {spotForm.latitude != null && spotForm.longitude != null && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">Locatie op kaart</div>
                    <MiniMapPreview position={[spotForm.latitude, spotForm.longitude]} />
                  </div>
                )}

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Extra info</span>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
                    placeholder="Bijvoorbeeld: in de frigo rechts van de toog"
                    value={spotForm.info}
                    onChange={(event) => {
                      setSpotForm((currentForm) => ({ ...currentForm, info: event.target.value }));
                    }}
                  />
                </label>

                {spotFormMessage && (
                  <div className={`text-sm ${spotFormMessage.includes("gekozen") ? "text-emerald-700" : "text-rose-600"}`}>
                    {spotFormMessage}
                  </div>
                )}

                <button
                  type="button"
                  className={`${accentButtonClass} min-h-11 w-full px-5 py-3 text-sm font-medium disabled:opacity-60`}
                  onClick={submitSpotForm}
                  disabled={isSubmittingSpot}
                >
                  {isSubmittingSpot ? "Bezig..." : "Bevestigen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPlace && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center p-3 sm:items-end sm:justify-end sm:p-4" onClick={() => setSelectedPlaceName(null)}>
          <div
            className="w-full max-w-md overflow-auto rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[78dvh] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <PlaceDetails
              key={selectedPlace.name}
              place={selectedPlace}
              status={placeStatuses.get(selectedPlace.name) ?? getOpenStatus(selectedPlace, now)}
              distance={selectedPlaceDistance}
              mateReport={getMateReport(selectedPlace.name)}
              onMateReport={(placeName, status) => setPendingMateReport({ placeName, status })}
              onClose={() => setSelectedPlaceName(null)}
              todayIndex={todayIndex}
            />
          </div>
        </div>
      )}

      {pendingMateReport && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="text-lg font-semibold text-slate-950">Melding bevestigen</div>
            <div className="mt-2 text-sm text-slate-600">
              Wil je melden dat bij {pendingMateReport.placeName} {reportStatusLabel(pendingMateReport.status).toLowerCase()} is?
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`${accentButtonClass} min-h-11 px-4 py-3 text-sm font-medium`}
                onClick={() => setPendingMateReport(null)}
              >
                Annuleer
              </button>
              <button
                type="button"
                className={`${accentButtonClass} min-h-11 px-4 py-3 text-sm font-medium`}
                onClick={confirmPendingMateReport}
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
