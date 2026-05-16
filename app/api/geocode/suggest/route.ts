const getGoogleApiKey = () => process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

const inferPlaceTypeFromText = (value?: string | null) => {
  const normalizedValue = value?.toLowerCase() ?? "";

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
    normalizedValue.includes("café")
    || normalizedValue.includes("cafe")
    || normalizedValue.includes("coffee")
    || normalizedValue.includes("koffie")
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

const mapGoogleTypeToPlaceType = (types?: string[], text?: string | null) => {
  if (!Array.isArray(types)) {
    return inferPlaceTypeFromText(text);
  }

  if (types.some((type) => type.includes("supermarket") || type.includes("grocery_store") || type.includes("convenience_store"))) {
    return "shop";
  }

  if (types.some((type) => type.includes("coffee_shop") || type.includes("cafe"))) {
    return "coffee_bar";
  }

  if (types.some((type) => type.includes("restaurant"))) {
    return "restaurant";
  }

  if (types.some((type) => type.includes("bar") || type.includes("night_club") || type.includes("pub"))) {
    return "cafe";
  }

  return inferPlaceTypeFromText(text);
};

const getGoogleAutocompleteError = async (response: Response | null) => {
  if (!response) {
    return "Google suggesties ophalen is mislukt. Google is niet bereikbaar.";
  }

  const text = await response.text().catch(() => "");

  try {
    const data = JSON.parse(text) as {
      error?: {
        message?: string;
        status?: string;
      };
      error_message?: string;
      status?: string;
    };
    const message = data.error?.message ?? data.error_message;
    const status = data.error?.status ?? data.status;

    if (message || status) {
      return `Google suggesties ophalen is mislukt: ${message ?? status}.`;
    }
  } catch {
    // Fall through to the generic status message below.
  }

  return `Google suggesties ophalen is mislukt. Google gaf status ${response.status}.`;
};

const fetchLegacyGoogleSuggestions = async (query: string, apiKey: string, sessionToken?: string) => {
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  url.searchParams.set("components", "country:be");
  url.searchParams.set("language", "nl");
  url.searchParams.set("location", "51.2194,4.4025");
  url.searchParams.set("radius", "25000");
  url.searchParams.set("key", apiKey);

  if (sessionToken) {
    url.searchParams.set("sessiontoken", sessionToken);
  }

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);

  if (!response?.ok) {
    return {
      suggestions: [],
      error: await getGoogleAutocompleteError(response),
    };
  }

  const data = await response.json().catch(() => null) as {
    status?: string;
    error_message?: string;
    predictions?: Array<{
      place_id?: string;
      description?: string;
      structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
      };
      types?: string[];
    }>;
  } | null;

  if (data?.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return {
      suggestions: [],
      error: `Google suggesties ophalen is mislukt: ${data.error_message ?? data.status}.`,
    };
  }

  return {
    suggestions: (data?.predictions ?? [])
      .map((prediction) => {
        const fullLabel = prediction.description?.trim();
        const name = prediction.structured_formatting?.main_text?.trim() || fullLabel;
        const secondaryText = prediction.structured_formatting?.secondary_text?.trim();

        if (!prediction.place_id || !fullLabel || !name) {
          return null;
        }

        return {
          placeId: prediction.place_id,
          placeResourceName: `places/${prediction.place_id}`,
          label: secondaryText ? `${name}, ${secondaryText}` : fullLabel,
          name,
          type: mapGoogleTypeToPlaceType(prediction.types, `${name} ${fullLabel}`),
        };
      })
      .filter(Boolean),
    error: null,
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sessionToken = searchParams.get("sessionToken")?.trim();

  if (!query || query.length < 3) {
    return Response.json({ suggestions: [] });
  }

  const googleApiKey = getGoogleApiKey();

  if (!googleApiKey) {
    return Response.json({
      suggestions: [],
      error: "Voeg GOOGLE_MAPS_API_KEY toe in Vercel.",
    });
  }

  const googleResponse = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ["be"],
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
      sessionToken: sessionToken || undefined,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!googleResponse?.ok) {
    const legacyResult = await fetchLegacyGoogleSuggestions(query, googleApiKey, sessionToken);

    if (legacyResult.suggestions.length > 0 || legacyResult.error === null) {
      return Response.json({
        provider: "google-legacy",
        suggestions: legacyResult.suggestions,
        error: legacyResult.error,
      });
    }

    return Response.json({
      suggestions: [],
      error: await getGoogleAutocompleteError(googleResponse),
    });
  }

  const data = await googleResponse.json().catch(() => null) as {
    suggestions?: Array<{
      placePrediction?: {
        place?: string;
        placeId?: string;
        text?: {
          text?: string;
        };
        structuredFormat?: {
          mainText?: {
            text?: string;
          };
          secondaryText?: {
            text?: string;
          };
        };
        types?: string[];
      };
    }>;
  } | null;

  return Response.json({
    provider: "google",
    suggestions: (data?.suggestions ?? [])
      .map((suggestion) => {
        const prediction = suggestion.placePrediction;
        const fullLabel = prediction?.text?.text?.trim();
        const name = prediction?.structuredFormat?.mainText?.text?.trim() || fullLabel;
        const secondaryText = prediction?.structuredFormat?.secondaryText?.text?.trim();

        if (!prediction?.place || !prediction.placeId || !fullLabel || !name) {
          return null;
        }

        return {
          placeId: prediction.placeId,
          placeResourceName: prediction.place,
          label: secondaryText ? `${name}, ${secondaryText}` : fullLabel,
          name,
          type: mapGoogleTypeToPlaceType(prediction.types, `${name} ${fullLabel}`),
        };
      })
      .filter(Boolean),
  });
}
