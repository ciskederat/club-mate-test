import { parseGoogleOpeningHours, parseWeekdayDescriptions } from "@/lib/openingHours";
import type { OpeningInterval } from "@/data/placeTypes";

const getGoogleApiKey = () => process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

const mapGoogleTypeToPlaceType = (
  primaryType?: string | null,
  googleMapsTypeLabel?: string | null,
  types?: string[],
  searchText?: string | null,
) => {
  const normalizedPrimaryType = primaryType?.toLowerCase() ?? "";
  const normalizedTypeLabel = googleMapsTypeLabel?.toLowerCase() ?? "";
  const normalizedTypes = Array.isArray(types) ? types.join(" ").toLowerCase() : "";
  const normalizedSearchText = searchText?.toLowerCase() ?? "";
  const combinedTypeText = `${normalizedPrimaryType} ${normalizedTypeLabel} ${normalizedTypes} ${normalizedSearchText}`;

  if (!combinedTypeText.trim()) {
    return "other";
  }

  if (
    combinedTypeText.includes("supermarket")
    || combinedTypeText.includes("grocery_store")
    || combinedTypeText.includes("convenience_store")
    || combinedTypeText.includes("liquor_store")
    || combinedTypeText.includes("food_store")
    || combinedTypeText.includes("winkel")
    || combinedTypeText.includes("supermarkt")
  ) {
    return "shop";
  }

  if (
    combinedTypeText.includes("coffee")
    || combinedTypeText.includes("caf")
    || combinedTypeText.includes("koffie")
  ) {
    return "coffee_bar";
  }

  if (
    combinedTypeText.includes("restaurant")
  ) {
    return "restaurant";
  }

  if (
    combinedTypeText.includes("lunch")
    || combinedTypeText.includes("sandwich")
  ) {
    return "lunchbar";
  }

  if (
    combinedTypeText.includes("bar")
    || combinedTypeText.includes("night_club")
    || combinedTypeText.includes("pub")
    || combinedTypeText.includes("drinking")
  ) {
    return "cafe";
  }

  return "other";
};

const normalizePlaceType = (value?: string | null) => value?.toLowerCase() ?? "";

const inferPlaceTypeFromText = (value?: string | null) => {
  const normalizedValue = normalizePlaceType(value);

  if (!normalizedValue.trim()) {
    return "other";
  }

  if (
    normalizedValue.includes("supermarkt")
    || normalizedValue.includes("supermarket")
    || normalizedValue.includes("grocery")
    || normalizedValue.includes("shop")
    || normalizedValue.includes("winkel")
    || normalizedValue.includes("nachtwinkel")
  ) {
    return "shop";
  }

  if (
    normalizedValue.includes("koffie")
    || normalizedValue.includes("coffee")
    || normalizedValue.includes("café")
    || normalizedValue.includes("cafe")
  ) {
    return "coffee_bar";
  }

  if (normalizedValue.includes("restaurant")) {
    return "restaurant";
  }

  if (
    normalizedValue.includes("lunch")
    || normalizedValue.includes("sandwich")
    || normalizedValue.includes("broodjes")
  ) {
    return "lunchbar";
  }

  if (
    normalizedValue.includes("bar")
    || normalizedValue.includes("pub")
    || normalizedValue.includes("taverne")
  ) {
    return "cafe";
  }

  return "other";
};

type GoogleOpeningHours = {
  periods?: Array<{
    open?: { day?: number; hour?: number; minute?: number; time?: string };
    close?: { day?: number; hour?: number; minute?: number; time?: string };
  }>;
  weekdayDescriptions?: string[];
};

type GooglePlaceDetails = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  primaryType?: string;
  types?: string[];
  googleMapsTypeLabel?: {
    text?: string;
  };
  regularOpeningHours?: GoogleOpeningHours;
  currentOpeningHours?: GoogleOpeningHours;
  regularSecondaryOpeningHours?: GoogleOpeningHours[];
  currentSecondaryOpeningHours?: GoogleOpeningHours[];
  websiteUri?: string;
};

type LegacyGooglePlaceDetails = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  types?: string[];
  opening_hours?: GoogleOpeningHours & {
    weekday_text?: string[];
  };
  website?: string;
};

const hasAnyHours = (hours: OpeningInterval[][]) => hours.some((dayHours) => dayHours.length > 0);

const firstHoursWithData = (...hourSets: OpeningInterval[][][]) =>
  hourSets.find(hasAnyHours) ?? hourSets[0];

const collectGoogleOpeningHourObjects = (value: unknown, collectedHours: GoogleOpeningHours[] = []) => {
  if (!value || typeof value !== "object") {
    return collectedHours;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectGoogleOpeningHourObjects(item, collectedHours);
    }

    return collectedHours;
  }

  const candidate = value as GoogleOpeningHours & Record<string, unknown>;

  if (Array.isArray(candidate.periods) || Array.isArray(candidate.weekdayDescriptions)) {
    collectedHours.push(candidate);
  }

  for (const nestedValue of Object.values(candidate)) {
    collectGoogleOpeningHourObjects(nestedValue, collectedHours);
  }

  return collectedHours;
};

const collectWeekdayDescriptionArrays = (value: unknown, collectedDescriptions: string[][] = []) => {
  if (!value || typeof value !== "object") {
    return collectedDescriptions;
  }

  if (Array.isArray(value)) {
    if (
      value.length > 0
      && value.every((item) => typeof item === "string")
      && value.some((item) => /maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon\.?|tue\.?|wed\.?|thu\.?|fri\.?|sat\.?|sun\.?/i.test(item))
      && value.some((item) => /\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?\s*[-–—]/i.test(item) || /24\s*(?:uur|hours)|24\/7/i.test(item))
    ) {
      collectedDescriptions.push(value as string[]);
      return collectedDescriptions;
    }

    for (const item of value) {
      collectWeekdayDescriptionArrays(item, collectedDescriptions);
    }

    return collectedDescriptions;
  }

  for (const nestedValue of Object.values(value)) {
    collectWeekdayDescriptionArrays(nestedValue, collectedDescriptions);
  }

  return collectedDescriptions;
};

const parseHoursFromUnknownGooglePayload = (value: unknown) => {
  const objectHours = collectGoogleOpeningHourObjects(value).flatMap((hoursObject) => [
    parseGoogleOpeningHours(hoursObject),
    parseWeekdayDescriptions(hoursObject.weekdayDescriptions),
  ]);
  const descriptionHours = collectWeekdayDescriptionArrays(value).map(parseWeekdayDescriptions);

  return firstHoursWithData(...objectHours, ...descriptionHours, Array.from({ length: 7 }, () => []));
};

const parseGoogleHours = (place?: GooglePlaceDetails | null) => {
  const secondaryHours = [
    ...(place?.regularSecondaryOpeningHours ?? []),
    ...(place?.currentSecondaryOpeningHours ?? []),
  ];

  return firstHoursWithData(
    parseGoogleOpeningHours(place?.regularOpeningHours),
    parseGoogleOpeningHours(place?.currentOpeningHours),
    ...secondaryHours.map((hours) => parseGoogleOpeningHours(hours)),
    parseWeekdayDescriptions(place?.regularOpeningHours?.weekdayDescriptions),
    parseWeekdayDescriptions(place?.currentOpeningHours?.weekdayDescriptions),
    ...secondaryHours.map((hours) => parseWeekdayDescriptions(hours.weekdayDescriptions)),
    parseHoursFromUnknownGooglePayload(place),
  );
};

const googlePlaceFieldMask = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "primaryType",
  "types",
  "googleMapsTypeLabel",
  "regularOpeningHours",
  "currentOpeningHours",
  "regularSecondaryOpeningHours",
  "currentSecondaryOpeningHours",
  "websiteUri",
].join(",");

const buildGooglePlaceDetailsResponse = (
  place: GooglePlaceDetails | null | undefined,
  fallbackPlaceId?: string | null,
  provider = "google",
  searchText?: string | null,
) => {
  const parsedHours = parseGoogleHours(place);
  const googleType = mapGoogleTypeToPlaceType(
    place?.primaryType,
    place?.googleMapsTypeLabel?.text,
    place?.types,
    `${searchText ?? ""} ${place?.displayName?.text ?? ""} ${place?.formattedAddress ?? ""}`,
  );
  const inferredType = inferPlaceTypeFromText(`${searchText ?? ""} ${place?.displayName?.text ?? ""} ${place?.formattedAddress ?? ""}`);

  return {
    provider,
    placeId: place?.id ?? fallbackPlaceId ?? null,
    hours: parsedHours,
    openingHoursFound: hasAnyHours(parsedHours),
    rawOpeningHours:
      place?.regularOpeningHours
      ?? place?.currentOpeningHours
      ?? place?.regularSecondaryOpeningHours
      ?? place?.currentSecondaryOpeningHours
      ?? null,
    address: place?.formattedAddress ?? null,
    name: place?.displayName?.text ?? null,
    website: place?.websiteUri ?? null,
    latitude: place?.location?.latitude ?? null,
    longitude: place?.location?.longitude ?? null,
    type: googleType === "other" ? inferredType : googleType,
  };
};

const buildLegacyGooglePlaceDetailsResponse = (
  place: LegacyGooglePlaceDetails | null | undefined,
  fallbackPlaceId?: string | null,
  provider = "google-legacy",
  searchText?: string | null,
) => {
  const parsedHours = firstHoursWithData(
    parseGoogleOpeningHours(place?.opening_hours),
    parseWeekdayDescriptions(place?.opening_hours?.weekdayDescriptions),
    parseWeekdayDescriptions(place?.opening_hours?.weekday_text),
    parseHoursFromUnknownGooglePayload(place),
  );

  const googleType = mapGoogleTypeToPlaceType(null, null, place?.types, `${searchText ?? ""} ${place?.name ?? ""} ${place?.formatted_address ?? ""}`);
  const inferredType = inferPlaceTypeFromText(`${searchText ?? ""} ${place?.name ?? ""} ${place?.formatted_address ?? ""}`);

  return {
    provider,
    placeId: place?.place_id ?? fallbackPlaceId ?? null,
    hours: parsedHours,
    openingHoursFound: hasAnyHours(parsedHours),
    rawOpeningHours: place?.opening_hours ?? null,
    address: place?.formatted_address ?? null,
    name: place?.name ?? null,
    website: place?.website ?? null,
    latitude: place?.geometry?.location?.lat ?? null,
    longitude: place?.geometry?.location?.lng ?? null,
    type: googleType === "other" ? inferredType : googleType,
  };
};

const fetchLegacyGoogleDetails = async (apiKey: string, placeId: string) => {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,name,formatted_address,geometry,opening_hours,types,website");
  url.searchParams.set("language", "nl");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const data = await response.json().catch(() => null) as {
    status?: string;
    result?: LegacyGooglePlaceDetails;
  } | null;

  return data?.status === "OK" ? data.result ?? null : null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("id")?.trim();
  const placeResourceName = searchParams.get("place")?.trim();
  const sessionToken = searchParams.get("sessionToken")?.trim();
  const textQuery = searchParams.get("q")?.trim();

  if (!placeId && !placeResourceName && !textQuery) {
    return Response.json({ error: "Place id ontbreekt." }, { status: 400 });
  }

  const googleApiKey = getGoogleApiKey();

  if (googleApiKey && (placeId || placeResourceName)) {
    const resourceName = placeResourceName || `places/${placeId}`;
    const detailsUrl = new URL(`https://places.googleapis.com/v1/${resourceName}`);
    detailsUrl.searchParams.set("languageCode", "nl");
    detailsUrl.searchParams.set("regionCode", "BE");

    const response = await fetch(detailsUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": googlePlaceFieldMask,
        ...(sessionToken ? { "X-Goog-Session-Token": sessionToken } : {}),
      },
      cache: "no-store",
    }).catch(() => null);

    if (response?.ok) {
      const data = await response.json().catch(() => null) as GooglePlaceDetails | null;

      if (hasAnyHours(parseGoogleHours(data)) || !textQuery) {
        return Response.json(buildGooglePlaceDetailsResponse(data, placeId, "google", textQuery));
      }
    }

    if (placeId) {
      const legacyPlace = await fetchLegacyGoogleDetails(googleApiKey, placeId);

      if (legacyPlace && hasAnyHours(buildLegacyGooglePlaceDetailsResponse(legacyPlace, placeId, "google-legacy", textQuery).hours)) {
        return Response.json(buildLegacyGooglePlaceDetailsResponse(legacyPlace, placeId, "google-legacy", textQuery));
      }
    }
  }

  if (googleApiKey && textQuery) {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": `places.${googlePlaceFieldMask.split(",").join(",places.")}`,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "nl",
        regionCode: "BE",
        locationBias: {
          circle: {
            center: {
              latitude: 51.2194,
              longitude: 4.4025,
            },
            radius: 25000,
          },
        },
      }),
      cache: "no-store",
    }).catch(() => null);

    if (response?.ok) {
      const data = await response.json().catch(() => null) as { places?: GooglePlaceDetails[] } | null;
      const places = Array.isArray(data?.places) ? data.places : [];
      const bestPlace = places.find((place) => hasAnyHours(parseGoogleHours(place))) ?? places[0];

      if (bestPlace) {
        if (!hasAnyHours(parseGoogleHours(bestPlace)) && bestPlace.id) {
          const legacyPlace = await fetchLegacyGoogleDetails(googleApiKey, bestPlace.id);

          if (legacyPlace && hasAnyHours(buildLegacyGooglePlaceDetailsResponse(legacyPlace, bestPlace.id, "google-text-search-legacy", textQuery).hours)) {
            return Response.json(buildLegacyGooglePlaceDetailsResponse(legacyPlace, bestPlace.id, "google-text-search-legacy", textQuery));
          }
        }

        return Response.json(buildGooglePlaceDetailsResponse(bestPlace, placeId, "google-text-search", textQuery));
      }
    }
  }

  return Response.json({ error: "Google gaf geen plaatsdetails terug. Controleer GOOGLE_MAPS_API_KEY." }, { status: 500 });
}
