import type { OpeningInterval } from "@/data/placeTypes";

const orderedDayCodes = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
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

    const intervals = timeValue
      .split(",")
      .map((part) => part.trim())
      .map((part) => {
        const intervalMatch = part.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
        return intervalMatch ? { open: intervalMatch[1], close: intervalMatch[2] } : null;
      })
      .filter((interval): interval is OpeningInterval => Boolean(interval));

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

    parsedHours[openDay] = [
      ...parsedHours[openDay],
      { open: openTime, close: closeTime },
    ];
  }

  return parsedHours;
};
