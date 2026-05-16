import type { OpeningInterval } from "@/data/placeTypes";

const orderedDayCodes = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const localizedDayToIndex: Record<string, number> = {
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  zondag: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
  ma: 1,
  di: 2,
  wo: 3,
  do: 4,
  vr: 5,
  za: 6,
  zo: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};
const dayCodeToIndex: Record<(typeof orderedDayCodes)[number], number> = {
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
  Su: 0,
};

const createEmptyParsedHours = () => Array.from({ length: 7 }, () => [] as OpeningInterval[]);

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const fromMinutes = (value: number) => {
  const normalizedValue = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedValue / 60);
  const minutes = normalizedValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizeTimeValue = (value: string) => {
  const normalizedValue = value
    .replace(/\./g, ":")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const match = normalizedValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3];

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  }

  if (meridiem === "am" && hours === 12) {
    hours = 0;
  }

  if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const parseLooseTimeIntervals = (value: string) => {
  const normalizedValue = value
    .replace(/\u202f/g, " ")
    .replace(/\u2009/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedValue
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      const intervalMatch = part.match(/^(\d{1,2}(?::|\.)?\d{0,2}\s*(?:AM|PM|am|pm)?)\s*-\s*(\d{1,2}(?::|\.)?\d{0,2}\s*(?:AM|PM|am|pm)?)$/);

      if (!intervalMatch) {
        return null;
      }

      const open = normalizeTimeValue(intervalMatch[1]);
      const close = normalizeTimeValue(intervalMatch[2]);

      return open && close ? { open, close } : null;
    })
    .filter((interval): interval is OpeningInterval => Boolean(interval));
};

type GoogleOpeningHoursPoint = {
  day?: number;
  hour?: number;
  minute?: number;
  time?: string;
};

type GoogleOpeningHoursPeriod = {
  open?: GoogleOpeningHoursPoint;
  close?: GoogleOpeningHoursPoint;
};

const expandDayToken = (token: string) => {
  const rangeMatch = token.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)\s*-\s*(Mo|Tu|We|Th|Fr|Sa|Su)$/);

  if (rangeMatch) {
    const startIndex = orderedDayCodes.indexOf(rangeMatch[1] as (typeof orderedDayCodes)[number]);
    const endIndex = orderedDayCodes.indexOf(rangeMatch[2] as (typeof orderedDayCodes)[number]);

    if (startIndex < 0 || endIndex < 0) {
      return [];
    }

    const expandedCodes: (typeof orderedDayCodes)[number][] = [];
    let currentIndex = startIndex;

    while (true) {
      expandedCodes.push(orderedDayCodes[currentIndex]);

      if (currentIndex === endIndex) {
        break;
      }

      currentIndex = (currentIndex + 1) % orderedDayCodes.length;
    }

    return expandedCodes.map((code) => dayCodeToIndex[code]);
  }

  if (token in dayCodeToIndex) {
    return [dayCodeToIndex[token as keyof typeof dayCodeToIndex]];
  }

  return [];
};

export const parseOpeningHoursText = (value?: string | null) => {
  if (!value) {
    return createEmptyParsedHours();
  }

  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (!normalizedValue) {
    return createEmptyParsedHours();
  }

  if (normalizedValue === "24/7") {
    return Array.from({ length: 7 }, () => [{ open: "00:00", close: "23:59" }]);
  }

  const parsedHours = createEmptyParsedHours();
  const segments = normalizedValue.split(";").map((segment) => segment.trim()).filter(Boolean);

  for (const segment of segments) {
    const match = segment.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:\s*,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+(.*)$/);

    if (!match) {
      continue;
    }

    const dayIndexes = match[1]
      .split(",")
      .flatMap((token) => expandDayToken(token.trim()));
    const timeValue = match[2].trim();

    if (/(off|closed)$/i.test(timeValue)) {
      for (const dayIndex of dayIndexes) {
        parsedHours[dayIndex] = [];
      }

      continue;
    }

    const intervals = parseLooseTimeIntervals(timeValue);

    if (intervals.length === 0) {
      continue;
    }

    for (const dayIndex of dayIndexes) {
      parsedHours[dayIndex] = intervals;
    }
  }

  return parsedHours;
};

const formatGoogleTime = (point?: GoogleOpeningHoursPoint) => {
  if (!point) {
    return null;
  }

  if (typeof point.time === "string" && /^\d{4}$/.test(point.time)) {
    return `${point.time.slice(0, 2)}:${point.time.slice(2)}`;
  }

  if (typeof point.hour === "number" && typeof point.minute === "number") {
    return `${String(point.hour).padStart(2, "0")}:${String(point.minute).padStart(2, "0")}`;
  }

  return null;
};

export const parseGoogleOpeningHours = (
  regularOpeningHours?: {
    periods?: GoogleOpeningHoursPeriod[];
  } | null,
) => {
  const parsedHours = createEmptyParsedHours();
  const periods = regularOpeningHours?.periods;

  if (!Array.isArray(periods) || periods.length === 0) {
    return parsedHours;
  }

  for (const period of periods) {
    const openDay = period.open?.day;
    const openTime = formatGoogleTime(period.open);
    const closeTime = formatGoogleTime(period.close);
    const closeDay = period.close?.day;

    if (typeof openDay !== "number" || !openTime) {
      continue;
    }

    if (!period.close) {
      parsedHours[openDay] = [{ open: "00:00", close: "23:59" }];
      continue;
    }

    if (!closeTime) {
      continue;
    }

    if (typeof closeDay === "number" && closeDay !== openDay) {
      parsedHours[openDay] = [
        ...parsedHours[openDay],
        { open: openTime, close: "23:59" },
      ];
      parsedHours[closeDay] = [
        ...parsedHours[closeDay],
        { open: "00:00", close: closeTime },
      ];
      continue;
    }

    parsedHours[openDay] = [
      ...parsedHours[openDay],
      { open: openTime, close: closeTime },
    ];
  }

  return parsedHours;
};

export const parseWeekdayDescriptions = (weekdayDescriptions?: string[] | null) => {
  const parsedHours = createEmptyParsedHours();

  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) {
    return parsedHours;
  }

  for (const description of weekdayDescriptions) {
    if (typeof description !== "string") {
      continue;
    }

    const [rawDayLabel, rawHoursValue] = description.split(/:\s+/, 2);

    if (!rawDayLabel || !rawHoursValue) {
      continue;
    }

    const dayIndex = localizedDayToIndex[rawDayLabel.trim().toLowerCase()];

    if (dayIndex == null) {
      continue;
    }

    const normalizedHoursValue = rawHoursValue
      .replace(/\u202f/g, " ")
      .replace(/\u2009/g, " ")
      .replace(/[–—]/g, "-")
      .trim();

    if (
      normalizedHoursValue.toLowerCase() === "gesloten"
      || normalizedHoursValue.toLowerCase() === "closed"
    ) {
      parsedHours[dayIndex] = [];
      continue;
    }

    if (normalizedHoursValue === "24 uur geopend" || normalizedHoursValue === "Open 24 hours") {
      parsedHours[dayIndex] = [{ open: "00:00", close: "23:59" }];
      continue;
    }

    const intervals = parseLooseTimeIntervals(normalizedHoursValue);

    if (intervals.length > 0) {
      parsedHours[dayIndex] = intervals.flatMap((interval) => {
        if (toMinutes(interval.close) >= toMinutes(interval.open)) {
          return [interval];
        }

        const nextDayIndex = (dayIndex + 1) % 7;
        parsedHours[nextDayIndex] = [
          ...parsedHours[nextDayIndex],
          { open: "00:00", close: interval.close },
        ];

        return [{ open: interval.open, close: fromMinutes(1439) }];
      });
    }
  }

  return parsedHours;
};
