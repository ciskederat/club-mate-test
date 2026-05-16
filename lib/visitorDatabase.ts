type VisitorEventInput = {
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
};

export type VisitorEvent = VisitorEventInput & {
  id: string;
  createdAt: string;
};

type VisitorEventRow = {
  id: string;
  session_id: string;
  path: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  language: string | null;
  timezone: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    baseUrl: `${url.replace(/\/$/, "")}/rest/v1/visitor_events`,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
};

export const isVisitorDatabaseConfigured = () => Boolean(getSupabaseConfig());

const mapRowToVisitorEvent = (row: VisitorEventRow): VisitorEvent => ({
  id: row.id,
  sessionId: row.session_id,
  path: row.path ?? undefined,
  deviceType: row.device_type ?? undefined,
  browser: row.browser ?? undefined,
  os: row.os ?? undefined,
  language: row.language ?? undefined,
  timezone: row.timezone ?? undefined,
  viewportWidth: row.viewport_width ?? undefined,
  viewportHeight: row.viewport_height ?? undefined,
  latitude: row.latitude,
  longitude: row.longitude,
  createdAt: row.created_at,
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

const trimValue = (value?: string) => value?.trim().slice(0, 120) || null;
const normalizeNumber = (value?: number | null) => Number.isFinite(value) ? Number(value) : null;

export const saveVisitorEvent = async (event: VisitorEventInput) => {
  const row = {
    session_id: trimValue(event.sessionId),
    path: trimValue(event.path),
    device_type: trimValue(event.deviceType),
    browser: trimValue(event.browser),
    os: trimValue(event.os),
    language: trimValue(event.language),
    timezone: trimValue(event.timezone),
    viewport_width: normalizeNumber(event.viewportWidth),
    viewport_height: normalizeNumber(event.viewportHeight),
    latitude: normalizeNumber(event.latitude),
    longitude: normalizeNumber(event.longitude),
  };

  if (!row.session_id) {
    throw new Error("SESSION_ID_REQUIRED");
  }

  const rows = await requestSupabase("?select=*", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  }) as VisitorEventRow[];

  return mapRowToVisitorEvent(rows[0]);
};

export const getVisitorEvents = async () => {
  if (!isVisitorDatabaseConfigured()) {
    return [];
  }

  const rows = await requestSupabase("?select=*&order=created_at.desc&limit=100") as VisitorEventRow[];
  return rows.map(mapRowToVisitorEvent);
};
