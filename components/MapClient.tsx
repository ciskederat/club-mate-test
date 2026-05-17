"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import Image from "next/image";
import { Info, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { Toaster, toast } from "sonner";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import { introPopupText } from "@/data/siteText";
import type { MateReportStatus, OpeningInterval, Place } from "@/data/placeTypes";
import { Button } from "@/components/ui/button";
import { LoaderTwo } from "@/components/ui/loader";

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

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
});

const icon = new L.Icon({
  iconUrl: "/custom-pin.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: "place-marker",
});

const userIcon = L.divIcon({
  className: "user-location-marker",
  html: "<span aria-hidden=\"true\"></span>",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
});

const mapTilerAquarelleUrl =
  "https://api.maptiler.com/maps/aquarelle-v4/256/{z}/{x}/{y}.png?key=rtNRwNDetFusrDDFDwMR";
const mapTilerAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a>';
const cartoLabelsOnlyUrl = "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png";
const cartoLabelsAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const filterOptions = [
  { value: "all", label: "Alles" },
  { value: "cafe", label: "Cafés" },
  { value: "shop", label: "Winkels" },
];

const accentButtonClass =
  "rounded-xl border border-[#9f4a3d]/55 bg-[#e5bd48] text-[#26304a] shadow-[0_6px_18px_rgba(52,38,31,0.11)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#8d3f35]/70 hover:bg-[#d8ac38] hover:shadow-[0_10px_24px_rgba(52,38,31,0.16)] active:translate-y-0";
const accentIconButtonClass =
  "grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#9f4a3d]/55 bg-[#e5bd48] text-[#26304a] shadow-[0_6px_18px_rgba(52,38,31,0.11)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#8d3f35]/70 hover:bg-[#d8ac38] hover:shadow-[0_10px_24px_rgba(52,38,31,0.16)] active:translate-y-0";
const secondaryButtonClass =
  "rounded-xl border border-[#9f4a3d]/28 bg-[#fff8e8]/72 text-[#46362d] shadow-[0_6px_18px_rgba(52,38,31,0.07)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#9f4a3d]/45 hover:bg-white/86 hover:shadow-[0_10px_24px_rgba(52,38,31,0.12)] active:translate-y-0";
const notableHomeButtonClass =
  `${bricolageGrotesque.className} font-bricolage flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[14px] border px-3 text-center text-[11px] font-bold leading-none tracking-[0.01em] transition duration-200 ease-out sm:h-9 sm:px-3.5 sm:text-[12px]`;
const toolbarButtonClass =
  "border-[#d9261c]/50 bg-[#fff8e8]/58 text-[#4a3a31] shadow-[inset_0_1px_0_rgba(255,255,255,0.58),0_4px_12px_rgba(52,38,31,0.06)] hover:border-[#d9261c]/38 hover:bg-[#fffaf0]/78 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_7px_16px_rgba(52,38,31,0.09)]";
const toolbarActiveButtonClass =
  "border-[#d9261c]/100 bg-[#f7c200]/88 text-[#252d43] shadow-[inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-2px_0_rgba(112,73,35,0.12),0_6px_16px_rgba(52,38,31,0.11)] hover:border-[#8d3f35]/62 hover:bg-[#d3a63d]";
const bricolageButtonStyle = {
  fontFamily: '"Bricolage Grotesque", sans-serif',
  fontWeight: 680,
  fontOpticalSizing: "auto" as const,
};

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
  consecutiveAbsentCount: number;
};

type MateReports = Record<string, MateReport>;

type PendingMateReport = {
  placeName: string;
  status: MateReportStatus;
};

type SaveAdminPlaceOptions = {
  closePanel?: boolean;
  showSuccessToast?: boolean;
  showValidationErrors?: boolean;
};

type DirectionsTarget = {
  name: string;
  address?: string;
  position: [number, number];
};

type VisitorEvent = {
  id: string;
  sessionId: string;
  path?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  language?: string;
  timezone?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
};

type SuggestionDetails = {
  hours?: OpeningInterval[][];
  rawOpeningHours?: unknown;
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
const introSeenStorageKey = "mate-alert-intro-seen";
const visitorSessionStorageKey = "mate-alert-visitor-session";

const normalizeType = (value: unknown) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

const getPlaceKey = (place: Place) =>
  place.id ?? `${normalizeType(place.name)}-${place.position[0]}-${place.position[1]}-${normalizeType(place.address)}`;

const getVisitorSessionId = () => {
  const storedSessionId = window.localStorage.getItem(visitorSessionStorageKey);

  if (storedSessionId) {
    return storedSessionId;
  }

  const sessionId = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(visitorSessionStorageKey, sessionId);
  return sessionId;
};

const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/ipad|tablet/.test(userAgent)) return "Tablet";
  if (/mobi|android|iphone|ipod/.test(userAgent)) return "GSM";
  return "Desktop";
};

const getBrowserName = () => {
  const userAgent = navigator.userAgent;

  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent) && !/Chromium|Edg\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "Onbekend";
};

const getOperatingSystem = () => {
  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "macOS";
  if (/Windows/.test(userAgent)) return "Windows";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Onbekend";
};

const roundVisitorCoordinate = (value: number) => Number(value.toFixed(2));

const createEmptyHours = () => Array.from({ length: 7 }, () => "");
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2).toString().padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

const createEmptyAdminForm = (): AdminPlaceForm => ({
  name: "",
  type: "other",
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
  type: "other",
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

const getAdminFormSignature = (form: AdminPlaceForm) =>
  JSON.stringify({
    name: form.name.trim(),
    type: form.type,
    latitude: form.latitude.trim(),
    longitude: form.longitude.trim(),
    info: form.info.trim(),
    address: form.address.trim(),
    dayHours: form.dayHours.map((value) => value.trim()),
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

const getDisplayCloseTime = (hours: Place["hours"], dayIndex: number, interval: OpeningInterval) => {
  if (interval.close !== "23:59") {
    return interval.close;
  }

  const nextDayIndex = (dayIndex + 1) % 7;
  const nextMorningInterval = hours?.[nextDayIndex]?.find((nextInterval) => nextInterval.open === "00:00");

  return nextMorningInterval?.close ?? interval.close;
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
      label: `Open tot ${getDisplayCloseTime(place.hours, previousDayIndex, previousOvernight)}`,
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
      label: `Open tot ${getDisplayCloseTime(place.hours, dayIndex, currentInterval)}`,
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

const formatDisplayHoursForDay = (hours: Place["hours"], dayIndex: number) => {
  const intervals = hours?.[dayIndex] ?? [];
  const previousDayIntervals = hours?.[(dayIndex + 6) % 7] ?? [];
  const nextDayIntervals = hours?.[(dayIndex + 1) % 7] ?? [];
  const carriedFromPreviousNight = previousDayIntervals.some((interval) => interval.close === "23:59");
  const nextMorningInterval = nextDayIntervals.find((interval) => interval.open === "00:00");
  const displayIntervals = intervals
    .filter((interval) => !(interval.open === "00:00" && carriedFromPreviousNight))
    .sort((a, b) => parseTime(a.open) - parseTime(b.open));

  if (displayIntervals.length === 0) {
    return "Gesloten";
  }

  return displayIntervals
    .map((interval) => {
      const close = interval.close === "23:59" && nextMorningInterval
        ? nextMorningInterval.close
        : interval.close;

      return `${interval.open} - ${close}`;
    })
    .join(", ");
};

const formatHours = (hours: Place["hours"], todayIndex: number) =>
  displayDayOrder.map((index) => {
    const intervals = hours?.[index] ?? [];

    return {
      key: shortDayLabels[index],
      day: dayLabels[index],
      shortDay: shortDayLabels[index],
      isToday: index === todayIndex,
      value: intervals.length === 0 ? "Gesloten" : formatDisplayHoursForDay(hours, index),
    };
  });

const typeLabel = (type: Place["type"]) => {
  if (type === "cafe") return "Café";
  if (type === "coffee_bar") return "Koffiebar";
  if (type === "restaurant") return "Restaurant";
  if (type === "lunchbar") return "Lunchbar";
  if (type === "shop") return "Supermarkt";
  return "Overig";
};

const placeMatchesFilter = (place: Place, normalizedFilter: string) => {
  if (normalizedFilter === "all") {
    return true;
  }

  if (normalizedFilter === "cafe") {
    return place.type === "cafe" || place.type === "coffee_bar";
  }

  return normalizeType(place.type) === normalizedFilter;
};

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
  const consecutiveAbsentCount = normalizeReportCount(report.consecutiveAbsentCount);

  if (!lastStatus && presentCount === 0 && absentCount === 0) {
    return undefined;
  }

  return {
    lastStatus,
    lastReportedAt,
    presentCount,
    absentCount,
    consecutiveAbsentCount,
  };
};

const getMateReportFromPlace = (place?: Place | null): MateReport | undefined => {
  if (!place) {
    return undefined;
  }

  const presentCount = normalizeReportCount(place.presentCount);
  const absentCount = normalizeReportCount(place.absentCount);
  const consecutiveAbsentCount = normalizeReportCount(place.consecutiveAbsentCount);

  if (!place.lastReportStatus && !place.lastReportedAt && presentCount === 0 && absentCount === 0) {
    return undefined;
  }

  return {
    lastStatus: place.lastReportStatus,
    lastReportedAt: place.lastReportedAt,
    presentCount,
    absentCount,
    consecutiveAbsentCount,
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

const getDirectionsQuery = (target: DirectionsTarget) =>
  encodeURIComponent(target.address?.trim() || `${target.name} ${target.position[0]},${target.position[1]}`);

const getAppleMapsUrl = (target: DirectionsTarget) =>
  `https://maps.apple.com/?daddr=${getDirectionsQuery(target)}&dirflg=w`;

const getGoogleMapsUrl = (target: DirectionsTarget) =>
  `https://www.google.com/maps/dir/?api=1&destination=${getDirectionsQuery(target)}`;

const getAutomaticDirectionsUrl = (target: DirectionsTarget) => {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(userAgent);

  return isAppleDevice ? getAppleMapsUrl(target) : getGoogleMapsUrl(target);
};

function OpenBadge({ status }: { status: OpenStatus }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-[#fff8e8]/72 px-3 py-1.5 text-sm font-semibold text-[#46362d] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_18px_rgba(52,38,31,0.08)] backdrop-blur">
      <span
        className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.75)] ${status.isOpen ? "bg-emerald-500" : "bg-slate-300"}`}
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
  onOpenDirections,
  onClose,
  todayIndex,
}: {
  place: Place;
  status: OpenStatus;
  distance?: number;
  mateReport?: MateReport;
  onMateReport: (placeName: string, status: MateReportStatus) => void;
  onOpenDirections: (target: DirectionsTarget) => void;
  onClose?: () => void;
  todayIndex: number;
}) {
  const [hoursOpen, setHoursOpen] = useState(false);
  const formattedHours = formatHours(place.hours, todayIndex);
  const hasFixedHours = Boolean(place.hours?.some((dayHours) => dayHours.length > 0));
  const wasLastReportedAbsent = mateReport?.lastStatus === "absent";

  return (
    <div className="space-y-3.5 text-slate-900 sm:space-y-4">
      <div className="sticky top-0 z-10 -mx-2 -mt-2 flex items-start justify-between gap-4 rounded-[1.5rem] border border-white/60 bg-[#fff8e8]/84 px-3 py-3 shadow-[0_10px_28px_rgba(52,38,31,0.09)] backdrop-blur-md">
        <div className="pr-2">
          <div className="w-fit rounded-full border border-[#9f4a3d]/18 bg-[#e5bd48]/35 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#26304a]">{typeLabel(place.type)}</div>
          <div className="retro-display mt-2 text-[1.55rem] leading-tight text-[#2f2822]">{place.name}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className={`${accentIconButtonClass} sticky top-0 text-lg`}
            onClick={onClose}
            aria-label="Sluit infovenster"
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.3} />
          </button>
        )}
      </div>

      <OpenBadge status={status} />

      {wasLastReportedAbsent && (
        <div className="rounded-2xl border border-rose-300/75 bg-rose-50/90 px-3.5 py-3 text-sm font-medium text-rose-900 shadow-[0_14px_32px_rgba(190,18,60,0.14)]">
          Laatste melding: mogelijk geen Club Mate meer aanwezig.
          {(mateReport?.consecutiveAbsentCount ?? 0) > 1 && (
            <span className="block text-xs font-semibold text-rose-700">
              {mateReport?.consecutiveAbsentCount} keer na elkaar afwezig gemeld.
            </span>
          )}
        </div>
      )}

      <div className="retro-soft-card space-y-1 rounded-2xl border border-white/60 bg-[#fffaf0]/62 p-3 shadow-[0_10px_26px_rgba(52,38,31,0.07)] backdrop-blur sm:p-3.5">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-slate-500">Adres</div>
        {place.address ? (
          <button
            type="button"
            className="text-left text-sm font-medium text-[#26304a] underline decoration-[#9f4a3d]/35 underline-offset-4 transition hover:text-[#8d3f35] hover:decoration-[#8d3f35]/60"
            onClick={() => onOpenDirections({
              name: place.name,
              address: place.address,
              position: place.position,
            })}
          >
            {place.address}
          </button>
        ) : (
          <div className="text-sm text-slate-800">Adres onbekend</div>
        )}
      </div>

      <div className="retro-soft-card space-y-1 rounded-2xl border border-white/60 bg-[#fffaf0]/62 p-3 shadow-[0_10px_26px_rgba(52,38,31,0.07)] backdrop-blur sm:p-3.5">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-slate-500">Info</div>
        <div className="text-sm text-slate-800">{place.info}</div>
      </div>

      <div className="retro-soft-card space-y-3 rounded-2xl border border-white/60 bg-[#fffaf0]/62 p-3 shadow-[0_10px_26px_rgba(52,38,31,0.07)] backdrop-blur sm:p-3.5">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-slate-500">Club Mate voorraad</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={`${accentButtonClass} min-h-10 px-3.5 py-2 text-sm font-semibold`}
            onClick={() => onMateReport(place.name, "present")}
          >
            Club Mate aanwezig
          </button>
          <button
            type="button"
            className={`${secondaryButtonClass} min-h-10 px-3.5 py-2 text-sm font-medium`}
            onClick={() => onMateReport(place.name, "absent")}
          >
            Niet meer aanwezig
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[#ecd2aa]/35 px-3 py-2 text-slate-700">
            Aanwezig gemeld: <span className="font-semibold">{mateReport?.presentCount ?? 0}</span>
          </div>
          <div className="rounded-xl bg-[#ecd2aa]/35 px-3 py-2 text-slate-700">
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
        <div className="retro-soft-card space-y-1 rounded-2xl border border-white/60 bg-[#fffaf0]/62 p-3 shadow-[0_10px_26px_rgba(52,38,31,0.07)] backdrop-blur sm:p-3.5">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-slate-500">Afstand</div>
          <div className="text-sm text-slate-800">{formatDistance(distance)}</div>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          className={`${secondaryButtonClass} flex min-h-10 w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold uppercase tracking-[0.08em]`}
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
          <div className="space-y-2 animate-[panelReveal_180ms_ease-out]">
            {hasFixedHours ? (
              formattedHours.map((item) => (
                <div
                  key={item.key}
                  className={`grid grid-cols-[minmax(4rem,auto)_1fr] items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                    item.isToday ? "border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-[0_8px_18px_rgba(16,185,129,0.08)]" : "border-white/60 bg-white/55 text-slate-800"
                  }`}
                >
                  <div className="font-medium capitalize">
                    {item.day}
                    {item.isToday ? " " : ""}
                  </div>
                  <div className="text-right">{item.value}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Geen vaste openingsuren gevonden.</div>
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

function ClusteredPlaceMarkers({
  places,
  onPlaceClick,
}: {
  places: Place[];
  onPlaceClick: (placeKey: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      animate: false,
      animateAddingMarkers: false,
      chunkedLoading: true,
      disableClusteringAtZoom: 18,
      maxClusterRadius: 42,
      removeOutsideVisibleBounds: false,
      showCoverageOnHover: false,
      spiderfyOnEveryZoom: false,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
    });

    clusterGroup.on("clusterclick", (event) => {
      const cluster = event.layer as L.MarkerCluster;
      const bounds = cluster.getBounds();
      const currentZoom = map.getZoom();
      const boundsZoom = map.getBoundsZoom(bounds, false, L.point(96, 96));
      const nextZoom = Math.min(Math.max(currentZoom + 1, boundsZoom), currentZoom + 1.25, 18);

      map.flyToBounds(bounds, {
        animate: true,
        duration: 0.65,
        easeLinearity: 0.18,
        maxZoom: nextZoom,
        padding: [96, 96],
      });
    });

    for (const place of places) {
      const marker = L.marker(place.position, {
        icon,
        title: place.name,
      });

      marker.on("click", () => {
        onPlaceClick(getPlaceKey(place));
      });

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);

    return () => {
      clusterGroup.clearLayers();
      map.removeLayer(clusterGroup);
    };
  }, [map, onPlaceClick, places]);

  return null;
}

function MiniMapPreview({
  position,
}: {
  position: [number, number];
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer
        center={position}
        zoom={16}
        className="mini-map-surface h-44 w-full"
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        touchZoom={false}
      >
        <TileLayer attribution={mapTilerAttribution} url={mapTilerAquarelleUrl} keepBuffer={1} />
        <TileLayer
          attribution={cartoLabelsAttribution}
          url={cartoLabelsOnlyUrl}
          opacity={0.94}
          updateWhenZooming={false}
          keepBuffer={1}
        />
        <Marker position={position} icon={icon} />
      </MapContainer>
    </div>
  );
}

export default function MapClient({ places }: { places: Place[] }) {
  const [filter, setFilter] = useState("all");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [databasePlaces, setDatabasePlaces] = useState<Place[]>(() => Array.isArray(places) ? places : []);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminSegment, setAdminSegment] = useState<"locations" | "visits">("locations");
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
  const [adminAutoSaveStatus, setAdminAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedAdminSignatureRef = useRef(getAdminFormSignature(createEmptyAdminForm()));
  const adminAutoSaveTimerRef = useRef<number | null>(null);
  const saveAdminPlaceRef = useRef<((options?: SaveAdminPlaceOptions) => Promise<boolean>) | null>(null);
  const visitTrackedRef = useRef(false);
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
  const [visitorEvents, setVisitorEvents] = useState<VisitorEvent[]>([]);
  const [isLoadingVisitorEvents, setIsLoadingVisitorEvents] = useState(false);
  const [visitorEventsError, setVisitorEventsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [introPanelOpen, setIntroPanelOpen] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [pendingMateReport, setPendingMateReport] = useState<PendingMateReport | null>(null);
  const [localMateReports] = useState<MateReports>(() => {
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
    if (window.localStorage.getItem(introSeenStorageKey) === "true") {
      return;
    }

    const timer = window.setTimeout(() => {
      setIntroPanelOpen(true);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

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
    if (visitTrackedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      visitTrackedRef.current = true;

      const roundedLocation = userLocation
        ? {
            latitude: roundVisitorCoordinate(userLocation[0]),
            longitude: roundVisitorCoordinate(userLocation[1]),
          }
        : {
            latitude: null,
            longitude: null,
          };

      fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: getVisitorSessionId(),
          path: window.location.pathname,
          deviceType: getDeviceType(),
          browser: getBrowserName(),
          os: getOperatingSystem(),
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          ...roundedLocation,
        }),
      }).catch(() => {
        // Analytics should never block the map experience.
      });
    }, userLocation ? 500 : 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [userLocation]);

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
                : "Suggesties ophalen is mislukt. Controleer je Google Maps API key en redeploy.",
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
    () => new Map(safePlaces.map((place) => [getPlaceKey(place), getOpenStatus(place, now)])),
    [safePlaces, now],
  );

  const filteredPlaces = useMemo(() => {
    const placesByType = normalizedFilter === "all"
      ? safePlaces
      : safePlaces.filter((place) => placeMatchesFilter(place, normalizedFilter));

    if (!openNowOnly) {
      return placesByType;
    }

    return placesByType.filter((place) => placeStatuses.get(getPlaceKey(place))?.isOpen);
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
    () => safePlaces.find((place) => getPlaceKey(place) === selectedPlaceName) ?? null,
    [safePlaces, selectedPlaceName],
  );
  const selectedPlaceDistance = useMemo(() => {
    if (!selectedPlace || !userLocation) return undefined;
    return getDistanceKm(userLocation, selectedPlace.position);
  }, [selectedPlace, userLocation]);
  const uniqueVisitorCount = useMemo(
    () => new Set(visitorEvents.map((visit) => visit.sessionId)).size,
    [visitorEvents],
  );
  const visitorLocationCount = useMemo(
    () => visitorEvents.filter((visit) => visit.latitude != null && visit.longitude != null).length,
    [visitorEvents],
  );
  const formatVisitDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Onbekend";
    }

    return new Intl.DateTimeFormat("nl-BE", {
      timeZone: placeTimeZone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const selectViewMode = (mode: "map" | "list") => {
    setSelectedPlaceName(null);
    setSpotFormOpen(false);
    setInfoPanelOpen(false);
    setViewMode(mode);
  };

  const selectFilter = (value: string) => {
    setSelectedPlaceName(null);
    setSpotFormOpen(false);
    setInfoPanelOpen(false);
    setFilter((currentFilter) => currentFilter === value && value !== "all" ? "all" : value);
  };

  const toggleOpenNowOnly = () => {
    setSelectedPlaceName(null);
    setSpotFormOpen(false);
    setInfoPanelOpen(false);
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
        const message = data?.error ?? "Code klopt niet.";
        setAdminError(message);
        toast.error(message);
        return;
      }

      setIsAdminUnlocked(true);
      setAdminPasscode(pin);
      setAdminError(null);
      setAdminPasscodeInput("");
      window.sessionStorage.setItem(adminSessionStorageKey, "true");
      window.sessionStorage.setItem(adminSessionPasscodeKey, pin);
      toast.success("Beheer ontgrendeld.");
    } catch {
      const message = "Beheer ontgrendelen is mislukt.";
      setAdminError(message);
      toast.error(message);
    }
  };

  const fetchVisitorEvents = async () => {
    setIsLoadingVisitorEvents(true);
    setVisitorEventsError(null);

    try {
      const response = await fetch("/api/admin/visits", {
        headers: {
          "x-admin-pin": adminPasscode,
        },
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        lockAdmin();
        return;
      }

      if (!response.ok) {
        setVisitorEventsError(data?.error ?? "Bezoekers ophalen is mislukt.");
        return;
      }

      setVisitorEvents(Array.isArray(data?.visits) ? data.visits : []);

      if (data?.databaseConfigured === false) {
        setVisitorEventsError("Bezoekersdatabase is nog niet geconfigureerd.");
      }
    } catch {
      setVisitorEventsError("Bezoekers ophalen is mislukt.");
    } finally {
      setIsLoadingVisitorEvents(false);
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
    setInfoPanelOpen(false);
    setSpotForm(createEmptySpotForm());
    setSpotSuggestions([]);
    setSpotSuggestionMessage(null);
    setSpotFormMessage(null);
    setSpotSuggestionSelected(false);
    setSpotFormOpen(true);
  };

  const fetchSuggestionDetails = async (
    placeId?: string,
    placeResourceName?: string,
    query?: string,
  ): Promise<SuggestionDetails | null> => {
    if (!placeId && !placeResourceName && !query) {
      return null;
    }

    const params = new URLSearchParams();

    if (placeId) {
      params.set("id", placeId);
    }

    if (placeResourceName) {
      params.set("place", placeResourceName);
    }

    if (query) {
      params.set("q", query);
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
    const emptyForm = createEmptyAdminForm();
    setAdminForm(emptyForm);
    lastSavedAdminSignatureRef.current = getAdminFormSignature(emptyForm);
    setAdminAutoSaveStatus("idle");
    setAddressSuggestionSelected(false);
    setAddressSuggestions([]);
    setAddressSuggestionMessage(null);
    setSpotFormOpen(false);
  };

  const startEditingPlace = (place: Place) => {
    const nextForm = createAdminFormFromPlace(place);
    setEditingPlaceName(getPlaceKey(place));
    setAdminForm(nextForm);
    lastSavedAdminSignatureRef.current = getAdminFormSignature(nextForm);
    setAdminAutoSaveStatus("idle");
    setAddressSuggestionSelected(true);
    setAddressSuggestions([]);
    setAddressSuggestionMessage(null);
  };

  const selectAddressSuggestion = async (suggestion: PlaceSuggestion) => {
    const details = await fetchSuggestionDetails(
      suggestion.placeId,
      suggestion.placeResourceName,
      `${suggestion.name} ${suggestion.label}`,
    );
    const latitude = details?.latitude ?? suggestion.latitude;
    const longitude = details?.longitude ?? suggestion.longitude;

    if (latitude == null || longitude == null) {
      const message = "Locatiegegevens ontbreken voor deze suggestie.";
      setAdminError(message);
      toast.error(message);
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
    toast.success("Adres gekozen.");
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
      const existingIndex = currentPlaces.findIndex((place) =>
        (updatedPlace.id && place.id === updatedPlace.id) || (fallbackName ? getPlaceKey(place) === fallbackName : false),
      );

      if (existingIndex < 0) {
        return [...currentPlaces, updatedPlace].sort((a, b) => a.name.localeCompare(b.name));
      }

      return currentPlaces.map((place, index) => index === existingIndex ? updatedPlace : place);
    });
  };

  const removePlaceFromState = (placeToRemove: Place) => {
    setDatabasePlaces((currentPlaces) =>
      currentPlaces.filter((place) =>
        placeToRemove.id
          ? place.id !== placeToRemove.id
          : getPlaceKey(place) !== getPlaceKey(placeToRemove),
      ),
    );
  };

  const saveAdminPlace = async ({
    closePanel = true,
    showSuccessToast = true,
    showValidationErrors = true,
  }: SaveAdminPlaceOptions = {}) => {
    const latitude = Number(adminForm.latitude);
    const longitude = Number(adminForm.longitude);
    const parsedHours = parseAdminHours(adminForm.dayHours);
    const editingPlace = safePlaces.find((place) => getPlaceKey(place) === editingPlaceName);

    if (!adminForm.name.trim()) {
      const message = "Naam is verplicht.";
      if (showValidationErrors) {
        setAdminError(message);
        toast.error(message);
      }
      return false;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const message = "Latitude en longitude moeten geldige nummers zijn.";
      if (showValidationErrors) {
        setAdminError(message);
        toast.error(message);
      }
      return false;
    }

    if (!parsedHours) {
      const message = "Gebruik openingsuren zoals 12:00-18:00, of laat leeg voor gesloten.";
      if (showValidationErrors) {
        setAdminError(message);
        toast.error(message);
      }
      return false;
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
      consecutiveAbsentCount: editingPlace?.consecutiveAbsentCount ?? 0,
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
          previousName: editingPlace?.name,
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        lockAdmin();
        return false;
      }

      if (!response.ok || !data?.place) {
        const message = data?.error ?? "Locatie opslaan is mislukt.";
        setAdminError(message);
        toast.error(message);
        setAdminAutoSaveStatus("error");
        return false;
      }

      updatePlaceInState(data.place, editingPlaceName ?? nextPlace.name);
      setSelectedPlaceName(getPlaceKey(data.place));
      setEditingPlaceName(getPlaceKey(data.place));
      const savedForm = createAdminFormFromPlace(data.place);
      setAdminForm(savedForm);
      lastSavedAdminSignatureRef.current = getAdminFormSignature(savedForm);
      setAdminError("Locatie opgeslagen.");
      setAdminAutoSaveStatus("saved");

      if (closePanel) {
        setAdminPanelOpen(false);
      }

      if (showSuccessToast) {
        toast.success("Locatie opgeslagen.");
      }

      return true;
    } catch {
      const message = "Locatie opslaan is mislukt.";
      setAdminError(message);
      toast.error(message);
      setAdminAutoSaveStatus("error");
      return false;
    }
  };

  useEffect(() => {
    saveAdminPlaceRef.current = saveAdminPlace;
  });

  useEffect(() => {
    if (!adminPanelOpen || !isAdminUnlocked) {
      return;
    }

    const signature = getAdminFormSignature(adminForm);
    const latitude = Number(adminForm.latitude);
    const longitude = Number(adminForm.longitude);
    const parsedHours = parseAdminHours(adminForm.dayHours);
    const canAutoSave =
      adminForm.name.trim().length > 0
      && Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && Boolean(parsedHours)
      && signature !== lastSavedAdminSignatureRef.current;

    if (!canAutoSave) {
      return;
    }

    setAdminAutoSaveStatus("saving");

    if (adminAutoSaveTimerRef.current != null) {
      window.clearTimeout(adminAutoSaveTimerRef.current);
    }

    adminAutoSaveTimerRef.current = window.setTimeout(() => {
      saveAdminPlaceRef.current?.({
        closePanel: false,
        showSuccessToast: false,
        showValidationErrors: false,
      });
    }, 900);

    return () => {
      if (adminAutoSaveTimerRef.current != null) {
        window.clearTimeout(adminAutoSaveTimerRef.current);
      }
    };
  }, [adminForm, adminPanelOpen, isAdminUnlocked]);

  const deleteAdminPlace = async () => {
    const editingPlace = safePlaces.find((place) => getPlaceKey(place) === editingPlaceName);

    if (!editingPlace) {
      const message = "Kies eerst een locatie om te verwijderen.";
      setAdminError(message);
      toast.error(message);
      return;
    }

    const confirmed = window.confirm(`Wil je "${editingPlace.name}" definitief verwijderen?`);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/admin/places", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPasscode,
        },
        body: JSON.stringify({ place: editingPlace }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        lockAdmin();
        return;
      }

      if (!response.ok) {
        const message = data?.error ?? "Locatie verwijderen is mislukt.";
        setAdminError(message);
        toast.error(message);
        return;
      }

      removePlaceFromState(editingPlace);
      setSelectedPlaceName((placeName) =>
        placeName === getPlaceKey(editingPlace) ? null : placeName,
      );
      setEditingPlaceName(null);
      setAdminForm(createEmptyAdminForm());
      setAddressSuggestionSelected(false);
      setAddressSuggestions([]);
      setAddressSuggestionMessage(null);
      setAdminError("Locatie verwijderd.");
      toast.success("Locatie verwijderd.");
    } catch {
      const message = "Locatie verwijderen is mislukt.";
      setAdminError(message);
      toast.error(message);
    }
  };

  const selectSpotSuggestion = async (suggestion: PlaceSuggestion) => {
    const details = await fetchSuggestionDetails(
      suggestion.placeId,
      suggestion.placeResourceName,
      `${suggestion.name} ${suggestion.label}`,
    );
    const latitude = details?.latitude ?? suggestion.latitude;
    const longitude = details?.longitude ?? suggestion.longitude;

    if (latitude == null || longitude == null) {
      const message = "Locatiegegevens ontbreken voor deze suggestie.";
      setSpotFormMessage(message);
      toast.error(message);
      return;
    }

    setSpotForm({
      name: details?.name || suggestion.name,
      address: details?.address || suggestion.label,
      info: "",
      latitude,
      longitude,
      type: details?.type ?? suggestion.type ?? "other",
      hours: details?.hours ?? Array.from({ length: 7 }, () => [] as OpeningInterval[]),
      placeId: suggestion.placeId,
    });
    setSpotSuggestions([]);
    setSpotSuggestionMessage(null);
    setSpotSuggestionSelected(true);
    setSpotFormMessage("Locatie gekozen. Controleer gerust nog even op de kaart.");
    toast.success("Locatie gekozen.");
    setSelectedPlaceName(null);
    setViewMode("map");
  };

  const submitSpotForm = async () => {
    if (!spotForm.name.trim() || spotForm.latitude == null || spotForm.longitude == null) {
      const message = "Kies eerst een locatie uit de suggesties.";
      setSpotFormMessage(message);
      toast.error(message);
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
        const message = data?.error ?? "Locatie toevoegen is mislukt.";
        setSpotFormMessage(message);
        toast.error(message);
        return;
      }

      updatePlaceInState(data.place);
      setSelectedPlaceName(getPlaceKey(data.place));
      setFocusTarget(data.place.position);
      closeSpotForm();
      toast.success("Spot doorgegeven.");
    } catch {
      const message = "Locatie toevoegen is mislukt.";
      setSpotFormMessage(message);
      toast.error(message);
    } finally {
      setIsSubmittingSpot(false);
    }
  };

  const getMateReport = (placeName: string) => {
    const place = safePlaces.find((candidatePlace) => getPlaceKey(candidatePlace) === placeName);
    return getMateReportFromPlace(place) ?? localMateReports[normalizeType(placeName)];
  };

  const reportMateStatus = async (placeName: string, status: MateReportStatus) => {
    const place = safePlaces.find((candidatePlace) => getPlaceKey(candidatePlace) === placeName);

    if (!place) {
      return false;
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

      if (!response.ok || (!data?.place && !data?.deleted)) {
        toast.error(data?.error ?? "Melding opslaan is mislukt.");
        return false;
      }

      if (data.deleted) {
        removePlaceFromState(place);
        setSelectedPlaceName((currentName) =>
          currentName === getPlaceKey(place) ? null : currentName,
        );
        toast.error(`${place.name} is verwijderd na 5 afwezig-meldingen op rij.`);
        return true;
      }

      updatePlaceInState(data.place, place.name);
      return true;
    } catch {
      toast.error("Melding kon niet worden opgeslagen. Controleer de verbinding of database.");
      return false;
    }
  };

  const updateMateReportCounts = async (placeName: string, presentCount: number, absentCount: number) => {
    const place = safePlaces.find((candidatePlace) => getPlaceKey(candidatePlace) === placeName);

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
        const message = data?.error ?? "Tellers aanpassen is mislukt.";
        setAdminError(message);
        toast.error(message);
        return;
      }

      updatePlaceInState(data.place, place.name);
      setAdminError("Tellers aangepast.");
      toast.success("Tellers aangepast.");
    } catch {
      const message = "Tellers aanpassen is mislukt.";
      setAdminError(message);
      toast.error(message);
    }
  };

  const confirmPendingMateReport = async () => {
    if (!pendingMateReport) {
      return;
    }

    const didSaveReport = await reportMateStatus(pendingMateReport.placeName, pendingMateReport.status);
    setPendingMateReport(null);

    if (didSaveReport) {
      toast.success("Melding doorgegeven.");
    }
  };

  const openDirections = (target: DirectionsTarget) => {
    window.open(getAutomaticDirectionsUrl(target), "_blank", "noreferrer");
  };

  const closeIntroPanel = () => {
    window.localStorage.setItem(introSeenStorageKey, "true");
    setIntroPanelOpen(false);
  };

  const selectedMateReport = selectedPlace ? getMateReport(getPlaceKey(selectedPlace)) : undefined;
  const selectedPlaceWasLastReportedAbsent = selectedMateReport?.lastStatus === "absent";
  const showFloatingUi = !adminPanelOpen && !spotFormOpen && !infoPanelOpen && !introPanelOpen;

  return (
    <div className="relative h-svh w-screen overflow-hidden bg-slate-100">
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          className: "font-bricolage",
          duration: 2400,
        }}
      />
      <AnimatePresence initial={false}>
        {showFloatingUi && (
          <motion.div
            key="toolbar"
            className="absolute left-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[1000] flex max-w-[calc(100vw-1rem)] flex-col items-start gap-1.5 sm:left-4 sm:top-4 sm:flex-row sm:items-center sm:gap-0"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
          <div className="flex items-center gap-1.5 rounded-[18px] border border-[#9f4a3d]/28 bg-[#efe0c6]/74 p-1.5 shadow-[0_12px_28px_rgba(52,38,31,0.12)] backdrop-blur-md sm:rounded-r-none sm:border-r-0 sm:p-2">
            <button
              type="button"
              className={`${notableHomeButtonClass} ${viewMode === "map" ? toolbarActiveButtonClass : toolbarButtonClass} min-w-[50px] sm:min-w-12`}
              style={bricolageButtonStyle}
              onClick={() => selectViewMode("map")}
            >
              Kaart
            </button>
            <button
              type="button"
              className={`${notableHomeButtonClass} ${viewMode === "list" ? toolbarActiveButtonClass : toolbarButtonClass} min-w-[50px] sm:min-w-12`}
              style={bricolageButtonStyle}
              onClick={() => selectViewMode("list")}
            >
              Lijst
            </button>
            <button
              type="button"
              className={`${adminPanelOpen ? toolbarActiveButtonClass : toolbarButtonClass} flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[14px] leading-none transition duration-200 ease-out sm:h-9 sm:w-9`}
              onClick={() => {
                setSelectedPlaceName(null);
                setSpotFormOpen(false);
                setInfoPanelOpen(false);
                setAdminPanelOpen((isOpen) => !isOpen);
              }}
              aria-label="Beheer"
              title="Beheer"
            >
              <Settings className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`${infoPanelOpen ? toolbarActiveButtonClass : toolbarButtonClass} flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold leading-none transition duration-200 ease-out sm:h-9 sm:w-9`}
              onClick={() => {
                setSelectedPlaceName(null);
                setSpotFormOpen(false);
                setAdminPanelOpen(false);
                setInfoPanelOpen(true);
              }}
              aria-label="Info over deze website"
              title="Info"
            >
              <Info className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-[18px] border border-[#9f4a3d]/28 bg-[#efe0c6]/74 p-1.5 shadow-[0_12px_28px_rgba(52,38,31,0.12)] backdrop-blur-md sm:rounded-l-none sm:border-l-0 sm:p-2">
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${notableHomeButtonClass} ${filter === option.value ? toolbarActiveButtonClass : toolbarButtonClass} min-w-[52px] sm:min-w-14`}
                  style={bricolageButtonStyle}
                  onClick={() => selectFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="h-5 w-px shrink-0 bg-[#9f4a3d]/22" aria-hidden="true" />
            <button
              type="button"
              className={`${notableHomeButtonClass} ${openNowOnly ? "border-emerald-500/55 bg-emerald-50/88 text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),inset_0_-2px_0_rgba(16,185,129,0.08),0_6px_16px_rgba(16,185,129,0.12)] hover:border-emerald-500/70 hover:bg-emerald-100/88" : toolbarButtonClass} min-w-[70px] gap-1.5 sm:min-w-[76px]`}
              style={bricolageButtonStyle}
              onClick={toggleOpenNowOnly}
              aria-pressed={openNowOnly}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shadow-[0_0_0_2px_rgba(255,248,232,0.58)] ${openNowOnly ? "bg-emerald-500" : "bg-[#b85b4f]/70"}`}
                aria-hidden="true"
              />
              Nu open
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {adminPanelOpen && (
        <motion.div
          key="admin-panel"
          className="fixed inset-0 z-[1200] bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setAdminPanelOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="retro-modal mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/50 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Beheer</div>
              <div className="retro-display text-2xl leading-tight text-[#2f2822]">Locaties aanpassen</div>
            </div>
            <button
              type="button"
              className={accentIconButtonClass}
              onClick={() => setAdminPanelOpen(false)}
              aria-label="Sluit beheer"
            >
              <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.3} />
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
            <>
            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <div className="flex w-fit gap-1.5 rounded-2xl border border-[#9f4a3d]/18 bg-[#efe0c6]/62 p-1">
                <button
                  type="button"
                  className={`${notableHomeButtonClass} ${adminSegment === "locations" ? toolbarActiveButtonClass : toolbarButtonClass} min-w-[76px]`}
                  style={bricolageButtonStyle}
                  onClick={() => setAdminSegment("locations")}
                >
                  Locaties
                </button>
                <button
                  type="button"
                  className={`${notableHomeButtonClass} ${adminSegment === "visits" ? toolbarActiveButtonClass : toolbarButtonClass} min-w-[82px]`}
                  style={bricolageButtonStyle}
                  onClick={() => {
                    setAdminSegment("visits");
                    fetchVisitorEvents();
                  }}
                >
                  Bezoekers
                </button>
              </div>
            </div>

            {adminSegment === "visits" ? (
              <div className="smooth-scroll-panel flex-1 overflow-auto p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-amber-200/80 bg-amber-50/75 p-4 text-sm text-amber-900">
                    Bezoekers worden anoniem getoond. Exacte identiteit, IP-adres en raw device fingerprint worden niet opgeslagen. Locatie verschijnt alleen afgerond wanneer iemand browserlocatie toestaat.
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bezoeken</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{visitorEvents.length}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unieke sessies</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{uniqueVisitorCount}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Met locatie</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{visitorLocationCount}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Laatste bezoeken</div>
                      <div className="text-xs text-slate-500">Maximaal de laatste 100 events.</div>
                    </div>
                    <button
                      type="button"
                      className={`${secondaryButtonClass} min-h-10 px-4 py-2 text-sm font-semibold`}
                      onClick={fetchVisitorEvents}
                    >
                      Vernieuwen
                    </button>
                  </div>

                  {visitorEventsError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {visitorEventsError}
                    </div>
                  )}

                  {isLoadingVisitorEvents ? (
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-500">Bezoekers laden...</div>
                  ) : visitorEvents.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-500">Nog geen bezoekers opgeslagen.</div>
                  ) : (
                    <div className="space-y-2">
                      {visitorEvents.map((visit) => (
                        <div key={visit.id} className="rounded-3xl border border-slate-200 bg-white/72 p-4 text-sm text-slate-700">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="font-semibold text-slate-900">{formatVisitDate(visit.createdAt)}</div>
                              <div className="text-xs text-slate-500">
                                Sessie {visit.sessionId.slice(0, 8)}
                              </div>
                            </div>
                            <div className="rounded-full bg-[#e5bd48]/22 px-3 py-1 text-xs font-semibold text-[#26304a]">
                              {visit.deviceType ?? "Onbekend"}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div>Browser: <span className="font-medium">{visit.browser ?? "Onbekend"}</span></div>
                            <div>OS: <span className="font-medium">{visit.os ?? "Onbekend"}</span></div>
                            <div>Taal: <span className="font-medium">{visit.language ?? "Onbekend"}</span></div>
                            <div>Tijdzone: <span className="font-medium">{visit.timezone ?? "Onbekend"}</span></div>
                            <div>Scherm: <span className="font-medium">{visit.viewportWidth && visit.viewportHeight ? `${visit.viewportWidth} x ${visit.viewportHeight}` : "Onbekend"}</span></div>
                            <div>Pad: <span className="font-medium">{visit.path ?? "/"}</span></div>
                            <div className="sm:col-span-2">
                              Locatie:{" "}
                              <span className="font-medium">
                                {visit.latitude != null && visit.longitude != null
                                  ? `${visit.latitude.toFixed(2)}, ${visit.longitude.toFixed(2)}`
                                  : "Niet gedeeld"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      key={getPlaceKey(place)}
                      type="button"
                      className={`min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        editingPlaceName === getPlaceKey(place)
                          ? "border-[#8d3f35]/65 bg-[#d5a83b] text-[#26304a] shadow-[0_8px_20px_rgba(52,38,31,0.14)]"
                          : "border-[#9f4a3d]/35 bg-[#fff8e8]/72 text-[#46362d] hover:border-[#9f4a3d]/55 hover:bg-[#e5bd48]/35"
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
                      <option value="coffee_bar">Koffiebar</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="lunchbar">Lunchbar</option>
                      <option value="shop">Supermarkt</option>
                      <option value="other">Overig</option>
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
                          value={editingPlaceName ? (getMateReport(editingPlaceName)?.presentCount ?? 0) : 0}
                          onChange={(event) => {
                            const currentReport = editingPlaceName ? getMateReport(editingPlaceName) : undefined;
                            updateMateReportCounts(
                              editingPlaceName ?? "",
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
                          value={editingPlaceName ? (getMateReport(editingPlaceName)?.absentCount ?? 0) : 0}
                          onChange={(event) => {
                            const currentReport = editingPlaceName ? getMateReport(editingPlaceName) : undefined;
                            updateMateReportCounts(
                              editingPlaceName ?? "",
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
                  <div className={`text-sm ${adminError === "Locatie opgeslagen." || adminError === "Locatie verwijderd." || adminError === "Tellers aangepast." || adminError === "Adres gekozen." ? "text-emerald-700" : "text-rose-600"}`}>
                    {adminError}
                  </div>
                )}

                {isAdminUnlocked && (
                  <div className={`text-xs font-semibold ${
                    adminAutoSaveStatus === "error"
                      ? "text-rose-600"
                      : adminAutoSaveStatus === "saving"
                        ? "text-amber-700"
                        : adminAutoSaveStatus === "saved"
                          ? "text-emerald-700"
                          : "text-slate-500"
                  }`}>
                    {adminAutoSaveStatus === "saving"
                      ? "Automatisch opslaan..."
                      : adminAutoSaveStatus === "saved"
                        ? "Automatisch opgeslagen"
                        : adminAutoSaveStatus === "error"
                          ? "Automatisch opslaan mislukt"
                          : "Wijzigingen worden automatisch opgeslagen"}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    className={`${accentButtonClass} min-h-11 w-full px-5 py-3 text-sm font-medium sm:w-auto`}
                  >
                    Opslaan en sluiten
                  </button>

                  {editingPlaceName && (
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-xl border border-rose-300/70 bg-rose-50/80 px-5 py-3 text-sm font-semibold text-rose-700 shadow-[0_6px_18px_rgba(127,29,29,0.07)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-100/90 hover:shadow-[0_10px_24px_rgba(127,29,29,0.1)] active:translate-y-0 sm:w-auto"
                      onClick={deleteAdminPlace}
                    >
                      Locatie verwijderen
                    </button>
                  )}
                </div>
              </form>
	            </div>
            )}
            </>
	          )}
	        </motion.div>
        </motion.div>
	      )}
      </AnimatePresence>

      {viewMode === "map" ? (
        <MapContainer
          center={[51.2194, 4.4025]}
          zoom={13}
          className="map-surface h-full w-full"
          zoomControl={false}
          zoomAnimation
          fadeAnimation
          markerZoomAnimation
          inertia
          inertiaDeceleration={2800}
          inertiaMaxSpeed={1200}
          keyboard={false}
          boxZoom={false}
          doubleClickZoom
          touchZoom
          tapHold={false}
          wheelDebounceTime={16}
          wheelPxPerZoomLevel={72}
        >
        <MapViewportController focusTarget={focusTarget} />
        <MapInteractionController
          onMapClick={() => {
            setSelectedPlaceName(null);
          }}
        />
        <TileLayer
          attribution={mapTilerAttribution}
          url={mapTilerAquarelleUrl}
          keepBuffer={4}
          updateWhenIdle={false}
          updateWhenZooming
          updateInterval={120}
        />
        <TileLayer
          attribution={cartoLabelsAttribution}
          url={cartoLabelsOnlyUrl}
          opacity={0.94}
          keepBuffer={3}
          updateWhenIdle={false}
          updateWhenZooming
          updateInterval={120}
        />
        <ZoomControl position="bottomright" />

        <ClusteredPlaceMarkers places={visiblePlaces} onPlaceClick={setSelectedPlaceName} />

        {userLocation && (
          <Marker position={userLocation} icon={userIcon} />
        )}

      </MapContainer>
      ) : (
        <div className="smooth-scroll-panel absolute inset-0 overflow-auto bg-[#f6efe2] p-3 pb-24 pt-28 sm:p-4 sm:pb-28 sm:pt-24">
          <div className="max-w-4xl mx-auto space-y-4">
            {listPlaces.length === 0 ? (
              <div className="retro-modal rounded-2xl border border-white/60 bg-white/70 p-5 text-center text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
                Geen locaties gevonden voor deze filters.
              </div>
            ) : (
              listPlaces.map((place: PlaceWithDistance) => {
                const status = placeStatuses.get(getPlaceKey(place)) ?? getOpenStatus(place, now);

                return (
                <button
                  key={getPlaceKey(place)}
                  type="button"
                  className="retro-modal w-full rounded-2xl border border-white/60 bg-[#fff8e8]/72 p-4 text-left shadow-[0_10px_30px_rgba(52,38,31,0.08)] backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#9f4a3d]/30 hover:shadow-[0_16px_38px_rgba(52,38,31,0.13)] focus:outline-none focus:ring-2 focus:ring-[#e5bd48]/35 sm:p-5"
                  onClick={() => setSelectedPlaceName(getPlaceKey(place))}
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

      <AnimatePresence initial={false}>
        {showFloatingUi && (
        <motion.div
          key="spot-button"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+2rem)] z-[1000] flex justify-center px-3 sm:bottom-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            type="button"
            className="pointer-events-auto relative grid h-11 w-[min(76vw,240px)] place-items-center overflow-hidden rounded-xl border-4 border-[#d9261c] bg-[#f7c200]/78 shadow-[0_16px_38px_rgba(52,38,31,0.18)] backdrop-blur-md transition duration-200 hover:border-[#d9261c] hover:ring-4 hover:ring-[#d9261c]/70 hover:shadow-[0_20px_46px_rgba(52,38,31,0.22)] sm:h-12 sm:w-[260px]"
            style={bricolageButtonStyle}
            onClick={openSpotForm}
            aria-label="Nieuwe Club Mate spot melden"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Image
              src="/mate%20alert.png"
              alt=""
              aria-hidden="true"
              width={905}
              height={100}
              className="relative z-10 h-auto w-[94%] object-contain"
            />
          </motion.button>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {spotFormOpen && (
        <motion.div
          key="spot-form"
          className="fixed inset-0 z-[1150] bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6"
          onClick={closeSpotForm}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="retro-modal mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/50 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nieuwe spot</div>
                <div className="retro-display text-2xl leading-tight text-[#2f2822]">Waar heb je Club Mate gezien?</div>
              </div>
              <button
                type="button"
                className={accentIconButtonClass}
                onClick={closeSpotForm}
                aria-label="Sluit formulier"
              >
                <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.3} />
              </button>
            </div>

            <div className="smooth-scroll-panel flex-1 overflow-auto p-4 sm:p-6">
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
                        className="block w-full border-t border-[#9f4a3d]/15 bg-[#fff8e8]/65 px-4 py-3 text-left text-sm text-[#46362d] transition first:border-t-0 hover:bg-[#e5bd48]/25"
                        onClick={() => selectSpotSuggestion(suggestion)}
                      >
                        <span className="block font-medium">{suggestion.name}</span>
                        <span className="block text-xs text-slate-500">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {spotForm.address && (
                  <div className="space-y-3 rounded-3xl border border-[#9f4a3d]/15 bg-[#fff8e8]/68 p-4 text-sm text-slate-700">
                    <div>
                      <div className="font-semibold text-slate-900">{spotForm.name}</div>
                      <div className="mt-1">{spotForm.address}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#9f4a3d]/18 bg-[#e5bd48]/30 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#26304a]">
                        {typeLabel(spotForm.type)}
                      </span>
                      {spotForm.hours.some((dayHours) => dayHours.length > 0) ? (
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Openingsuren gevonden
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-500/25 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          Geen vaste openingsuren gevonden
                        </span>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/60 bg-white/55 p-3">
                      <div className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-slate-500">Openingsuren</div>
                      {spotForm.hours.some((dayHours) => dayHours.length > 0) ? (
                        <div className="mt-2 grid gap-1.5">
                          {formatHours(spotForm.hours, todayIndex).map((day) => (
                            <div
                              key={day.key}
                              className={`grid grid-cols-[3.75rem_1fr] gap-2 rounded-xl px-2 py-1.5 text-xs ${day.isToday ? "bg-[#e5bd48]/25 text-[#26304a]" : "text-slate-600"}`}
                            >
                              <span className="font-semibold capitalize">{day.shortDay}</span>
                              <span>{day.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">
                          Google gaf voor deze plek geen bruikbare vaste openingsuren terug.
                        </div>
                      )}
                    </div>
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

                <Button
                  type="button"
                  className={`${accentButtonClass} min-h-11 w-full px-5 py-3 text-sm font-medium disabled:opacity-60`}
                  onClick={submitSpotForm}
                  disabled={isSubmittingSpot}
                >
                  {isSubmittingSpot ? (
                    <span className="flex items-center justify-center gap-2">
                      Bezig
                      <span className="scale-75">
                        <LoaderTwo />
                      </span>
                    </span>
                  ) : (
                    "Bevestigen"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {introPanelOpen && (
        <motion.div
          key="intro-panel"
          className="fixed inset-0 z-[1180] grid place-items-center bg-slate-950/38 p-3 backdrop-blur-sm sm:p-6"
          onClick={closeIntroPanel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="retro-modal w-full max-w-[25rem] overflow-hidden rounded-[1.75rem] border border-white/55 bg-[#fff7e8]/92 p-5 text-slate-800 shadow-[0_28px_80px_rgba(52,38,31,0.28)] backdrop-blur-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="relative h-8 w-44 sm:h-9 sm:w-52" aria-label="Mate Alert">
                <Image
                  src="/mate%20alert.png"
                  alt="Mate Alert"
                  fill
                  sizes="208px"
                  className="object-contain object-left"
                  priority={false}
                />
              </div>
              <button
                type="button"
                className={accentIconButtonClass}
                onClick={closeIntroPanel}
                aria-label="Sluit uitleg"
              >
                <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.3} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
              <p>{introPopupText.firstParagraph}</p>
              <p>{introPopupText.secondParagraph}</p>
            </div>

            <button
              type="button"
              className={`${accentButtonClass} mt-5 min-h-11 w-full px-5 py-3 text-sm font-semibold`}
              onClick={closeIntroPanel}
            >
              {introPopupText.buttonLabel}
            </button>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {infoPanelOpen && (
        <motion.div
          key="info-panel"
          className="fixed inset-0 z-[1150] grid place-items-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setInfoPanelOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="retro-modal flex max-h-[calc(100svh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-white/55 bg-[#fff7e8]/90 p-5 text-slate-800 shadow-[0_28px_80px_rgba(52,38,31,0.28)] backdrop-blur-xl sm:max-h-[min(82svh,46rem)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Info</div>
                <div className="relative mt-2 h-7 w-40 sm:h-8 sm:w-44" aria-label="Mate Alert">
                  <Image
                    src="/mate%20alert.png"
                    alt="Mate Alert"
                    fill
                    sizes="176px"
                    className="object-contain object-left"
                    priority={false}
                  />
                </div>
              </div>
              <button
                type="button"
                className={accentIconButtonClass}
                onClick={() => setInfoPanelOpen(false)}
                aria-label="Sluit info"
              >
                <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.3} />
              </button>
            </div>

<div className="smooth-scroll-panel -mx-1 mt-4 flex-1 space-y-4 overflow-auto px-1 pr-2 text-sm leading-relaxed text-slate-700">
  <p>
    Heb je zin in die koude, overheerlijke en verslavende{" "}
    <a
      href="https://www.club-mate.de/en/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:opacity-80"
    >
      Club Mate
    </a>
    ? Of heb jij de drang om alle spots met{" "}
    <a
      href="https://www.clubmate.de/en/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:opacity-80"
    >
      Club Mate
    </a>{" "}
    mee aan te vullen op de kaart? Dan is dit de juiste plek.
  </p>
  <p>
    Deze website is een verzameling van verschillende verkooppunten van het
    drankje. Van cafés, koffiebars en restaurants tot supermarkten,
    nachtwinkels en andere random plekken waar iemand ooit plots oog in oog
    stond met een flesje{" "}
    <a
      href="https://www.clubmate.de/en/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:opacity-80"
    >
      Club Mate
    </a>
    .
  </p>
  <p>
    Deze website is volledig community based. Elke locatie werd handmatig
    toegevoegd door mensen die ergens een spot gevonden hebben. Daardoor kan het
    zijn dat sommige locaties niet meer kloppen, tijdelijk uitverkocht zijn of
    gestopt zijn met verkopen. In dat geval kan je dit melden bij de locatie
    zelf zodat de kaart een beetje proper blijft voor de volgende wanhopige
    zoeker.
  </p>
  <div>
    <h3 className="mb-2 font-bold">Hoe werkt het?</h3>
    <p>
      Zelf een mate gespot in het wild? Gebruik dan de Mate Alert knop onderaan
      het scherm en geef de locatie in. Na het toevoegen verschijnt deze
      automatisch op de kaart zodat anderen die plek ook kunnen terugvinden.
    </p>
  </div>
  <p>
    Je kan op locaties klikken om meer info te bekijken zoals de naam van de
    plek, het adres en soms extra info die werd toegevoegd door andere
    gebruikers. Sommige spots zijn hidden gems. Andere zijn letterlijk gewoon een
    tankstation ergens in de middle of nowhere. Alles telt.
  </p>
  <p>
    Dus: zie je ergens{" "}
    <a
      href="https://www.club-mate.de/en/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:opacity-80"
    >
      Club Mate
    </a>{" "}
    staan? Voeg het toe. Zie je een fout? Meld het. En vooral: ga op
    ontdekking.
  </p>
  <p className="font-semibold">
    Veel succes met uw zoektocht naar cafeïne en innerlijke vrede.
  </p>
</div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {selectedPlace && (
        <motion.div
          key="place-details"
          className="fixed inset-0 z-[1100] flex items-end justify-center p-3 sm:items-end sm:justify-end sm:p-4"
          onClick={() => setSelectedPlaceName(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className={`smooth-scroll-panel retro-info-panel max-h-[calc(100svh-1.5rem)] w-full max-w-md overflow-auto rounded-[1.75rem] border p-3.5 backdrop-blur-xl sm:max-h-[78svh] sm:p-5 ${
              selectedPlaceWasLastReportedAbsent
                ? "border-rose-300/85 bg-rose-50/88 shadow-[0_0_0_1px_rgba(244,63,94,0.22),0_28px_90px_rgba(190,18,60,0.28)]"
                : "border-white/55 bg-[#fff7e8]/84 shadow-[0_28px_80px_rgba(52,38,31,0.3)]"
            }`}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlaceDetails
              key={selectedPlace.name}
              place={selectedPlace}
              status={placeStatuses.get(getPlaceKey(selectedPlace)) ?? getOpenStatus(selectedPlace, now)}
              distance={selectedPlaceDistance}
              mateReport={selectedMateReport}
              onMateReport={(placeName, status) => setPendingMateReport({ placeName, status })}
              onOpenDirections={openDirections}
              onClose={() => setSelectedPlaceName(null)}
              todayIndex={todayIndex}
            />
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {pendingMateReport && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-slate-950/40 p-4">
          <div className="retro-modal w-full max-w-sm rounded-[2rem] border border-white/55 bg-white/90 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <div className="retro-display text-2xl leading-tight text-[#2f2822]">Melding bevestigen</div>
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
