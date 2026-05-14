import { places as fallbackPlaces } from "@/data/places";
import type { MateReportStatus, OpeningInterval, Place } from "@/data/placeTypes";

type PlaceRow = {
  id: string;
  name: string;
  type: Place["type"];
  address: string | null;
  latitude: number;
  longitude: number;
  info: string | null;
  hours: OpeningInterval[][] | null;
  present_count: number | null;
  absent_count: number | null;
  last_report_status: MateReportStatus | null;
  last_reported_at: string | null;
};

type SavePlaceInput = {
  id?: string;
  previousName?: string;
  place: Place;
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    baseUrl: `${url.replace(/\/$/, "")}/rest/v1/places`,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
};

export const isDatabaseConfigured = () => Boolean(getSupabaseConfig());

const mapRowToPlace = (row: PlaceRow): Place => ({
  id: row.id,
  name: row.name,
  type: row.type,
  position: [Number(row.latitude), Number(row.longitude)],
  info: row.info ?? "Club Mate verkrijgbaar",
  address: row.address ?? "",
  hours: Array.isArray(row.hours) ? row.hours : [],
  presentCount: Math.max(0, Number(row.present_count ?? 0)),
  absentCount: Math.max(0, Number(row.absent_count ?? 0)),
  lastReportStatus: row.last_report_status ?? undefined,
  lastReportedAt: row.last_reported_at ?? undefined,
});

const mapPlaceToRow = (place: Place) => ({
  name: place.name,
  type: place.type,
  address: place.address ?? "",
  latitude: place.position[0],
  longitude: place.position[1],
  info: place.info,
  hours: place.hours ?? [],
  present_count: Math.max(0, Number(place.presentCount ?? 0)),
  absent_count: Math.max(0, Number(place.absentCount ?? 0)),
  last_report_status: place.lastReportStatus ?? null,
  last_reported_at: place.lastReportedAt ?? null,
});

const requestSupabase = async (path: string, init?: RequestInit) => {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      ...config.headers,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const getPlaces = async () => {
  if (!isDatabaseConfigured()) {
    return fallbackPlaces;
  }

  try {
    const rows = await requestSupabase("?select=*&order=name.asc") as PlaceRow[];
    return rows.map(mapRowToPlace);
  } catch {
    return fallbackPlaces;
  }
};

export const savePlace = async ({ id, previousName, place }: SavePlaceInput) => {
  const row = mapPlaceToRow(place);
  const selector = id
    ? `id=eq.${encodeURIComponent(id)}`
    : previousName
      ? `name=eq.${encodeURIComponent(previousName)}`
      : "";

  if (selector) {
    const rows = await requestSupabase(`?${selector}&select=*`, {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    }) as PlaceRow[];

    if (rows.length > 0) {
      return mapRowToPlace(rows[0]);
    }
  }

  const rows = await requestSupabase("?select=*", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  }) as PlaceRow[];

  return mapRowToPlace(rows[0]);
};

export const reportMateStatus = async (place: Place, status: MateReportStatus) => {
  const now = new Date().toISOString();
  const presentCount = Math.max(0, Number(place.presentCount ?? 0)) + (status === "present" ? 1 : 0);
  const absentCount = Math.max(0, Number(place.absentCount ?? 0)) + (status === "absent" ? 1 : 0);
  const selector = place.id
    ? `id=eq.${encodeURIComponent(place.id)}`
    : `name=eq.${encodeURIComponent(place.name)}`;

  const rows = await requestSupabase(`?${selector}&select=*`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      present_count: presentCount,
      absent_count: absentCount,
      last_report_status: status,
      last_reported_at: now,
    }),
  }) as PlaceRow[];

  return mapRowToPlace(rows[0]);
};

export const updateReportCounts = async (place: Place, presentCount: number, absentCount: number) => {
  const selector = place.id
    ? `id=eq.${encodeURIComponent(place.id)}`
    : `name=eq.${encodeURIComponent(place.name)}`;

  const rows = await requestSupabase(`?${selector}&select=*`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      present_count: Math.max(0, Math.floor(presentCount)),
      absent_count: Math.max(0, Math.floor(absentCount)),
    }),
  }) as PlaceRow[];

  return mapRowToPlace(rows[0]);
};
