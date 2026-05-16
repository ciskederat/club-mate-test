import { parseGoogleOpeningHours, parseOpeningHoursText, parseWeekdayDescriptions } from "@/lib/openingHours";
import type { OpeningInterval } from "@/data/placeTypes";

const getGoogleApiKey = () => process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

const mapGoogleTypeToPlaceType = (primaryType?: string | null, googleMapsTypeLabel?: string | null, types?: string[]) => {
  const normalizedPrimaryType = primaryType?.toLowerCase() ?? "";
  const normalizedTypeLabel = googleMapsTypeLabel?.toLowerCase() ?? "";
  const normalizedTypes = Array.isArray(types) ? types.join(" ").toLowerCase() : "";
  const combinedTypeText = `${normalizedPrimaryType} ${normalizedTypeLabel} ${normalizedTypes}`;

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
  ) {
    return "cafe";
  }

  return "other";
};

const mapGeoapifyCategoryToPlaceType = (category?: string | null) => {
  const normalizedCategory = category?.toLowerCase() ?? "";

  if (
    normalizedCategory.includes("commercial.supermarket")
    || normalizedCategory.includes("commercial.food_and_drink")
    || normalizedCategory.includes("commercial.convenience")
    || normalizedCategory.includes("commercial.marketplace")
    || normalizedCategory.includes("shop.supermarket")
    || normalizedCategory.includes("shop.convenience")
    || normalizedCategory.includes("shop.food")
  ) {
    return "shop";
  }

  if (
    normalizedCategory.includes("catering.cafe")
    || normalizedCategory.includes("cafe")
    || normalizedCategory.includes("coffee")
  ) {
    return "coffee_bar";
  }

  if (
    normalizedCategory.includes("restaurant")
    || normalizedCategory.includes("catering.restaurant")
  ) {
    return "restaurant";
  }

  if (
    normalizedCategory.includes("lunch")
    || normalizedCategory.includes("sandwich")
    || normalizedCategory.includes("fast_food")
  ) {
    return "lunchbar";
  }

  if (
    normalizedCategory.includes("bar")
    || normalizedCategory.includes("pub")
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

const hasAnyHours = (hours: OpeningInterval[][]) => hours.some((dayHours) => dayHours.length > 0);

const firstHoursWithData = (...hourSets: OpeningInterval[][][]) =>
  hourSets.find(hasAnyHours) ?? hourSets[0];

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
) => {
  const parsedHours = parseGoogleHours(place);

  return {
    provider,
    placeId: place?.id ?? fallbackPlaceId ?? null,
    hours: parsedHours,
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
    type: mapGoogleTypeToPlaceType(place?.primaryType, place?.googleMapsTypeLabel?.text, place?.types),
  };
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
    const response = await fetch(`https://places.googleapis.com/v1/${resourceName}`, {
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
        return Response.json(buildGooglePlaceDetailsResponse(data, placeId));
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
        return Response.json(buildGooglePlaceDetailsResponse(bestPlace, placeId, "google-text-search"));
      }
    }
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "Voeg GOOGLE_MAPS_API_KEY of GEOAPIFY_API_KEY toe in Vercel." }, { status: 500 });
  }

  if (!placeId) {
    return Response.json({ error: "Fallback naar Geoapify vereist een place id." }, { status: 400 });
  }

  const url = new URL("https://api.geoapify.com/v2/place-details");
  url.searchParams.set("id", placeId);
  url.searchParams.set("lang", "nl");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);

  if (!response) {
    return Response.json({ error: "Geoapify is niet bereikbaar." }, { status: 502 });
  }

  if (!response.ok) {
    return Response.json({ error: "Plaatsdetails ophalen is mislukt." }, { status: response.status });
  }

  const data = await response.json().catch(() => null) as {
    features?: Array<{
      properties?: {
        opening_hours?: string;
        formatted?: string;
        name?: string;
        website?: string;
        category?: string;
      };
    }>;
  } | null;

  const properties = data?.features?.[0]?.properties;

  return Response.json({
    provider: "geoapify",
    hours: parseOpeningHoursText(properties?.opening_hours),
    rawOpeningHours: properties?.opening_hours ?? null,
    address: properties?.formatted ?? null,
    name: properties?.name ?? null,
    website: properties?.website ?? null,
    type: mapGeoapifyCategoryToPlaceType(properties?.category),
  });
}
