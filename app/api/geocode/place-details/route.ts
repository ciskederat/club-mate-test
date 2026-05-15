import { parseGoogleOpeningHours, parseOpeningHoursText } from "@/lib/openingHours";

const getGoogleApiKey = () => process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

const mapGoogleTypeToPlaceType = (primaryType?: string | null) => {
  if (!primaryType) {
    return undefined;
  }

  if (primaryType.includes("supermarket") || primaryType.includes("grocery_store") || primaryType.includes("convenience_store")) {
    return "shop";
  }

  if (primaryType.includes("cafe") || primaryType.includes("bar") || primaryType.includes("restaurant") || primaryType.includes("night_club")) {
    return "cafe";
  }

  return undefined;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("id")?.trim();
  const placeResourceName = searchParams.get("place")?.trim();
  const sessionToken = searchParams.get("sessionToken")?.trim();

  if (!placeId && !placeResourceName) {
    return Response.json({ error: "Place id ontbreekt." }, { status: 400 });
  }

  const googleApiKey = getGoogleApiKey();

  if (googleApiKey && (placeId || placeResourceName)) {
    const resourceName = placeResourceName || `places/${placeId}`;
    const response = await fetch(`https://places.googleapis.com/v1/${resourceName}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,primaryType,regularOpeningHours,websiteUri",
        ...(sessionToken ? { "X-Goog-Session-Token": sessionToken } : {}),
      },
      cache: "no-store",
    }).catch(() => null);

    if (response?.ok) {
      const data = await response.json().catch(() => null) as {
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
        regularOpeningHours?: {
          periods?: Array<{
            open?: { day?: number; hour?: number; minute?: number; time?: string };
            close?: { day?: number; hour?: number; minute?: number; time?: string };
          }>;
        };
        websiteUri?: string;
      } | null;

      return Response.json({
        provider: "google",
        placeId: data?.id ?? placeId ?? null,
        hours: parseGoogleOpeningHours(data?.regularOpeningHours),
        rawOpeningHours: data?.regularOpeningHours ?? null,
        address: data?.formattedAddress ?? null,
        name: data?.displayName?.text ?? null,
        website: data?.websiteUri ?? null,
        latitude: data?.location?.latitude ?? null,
        longitude: data?.location?.longitude ?? null,
        type: mapGoogleTypeToPlaceType(data?.primaryType),
      });
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
  });
}
