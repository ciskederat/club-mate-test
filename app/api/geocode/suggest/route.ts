const getGoogleApiKey = () => process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;

const mapGoogleTypeToPlaceType = (types?: string[]) => {
  if (!Array.isArray(types)) {
    return "other";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sessionToken = searchParams.get("sessionToken")?.trim();

  if (!query || query.length < 3) {
    return Response.json({ suggestions: [] });
  }

  const googleApiKey = getGoogleApiKey();

  if (googleApiKey) {
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

    if (googleResponse?.ok) {
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
              type: mapGoogleTypeToPlaceType(prediction.types),
            };
          })
          .filter(Boolean),
      });
    }
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return Response.json({
      suggestions: [],
      error: "Voeg GOOGLE_MAPS_API_KEY of GEOAPIFY_API_KEY toe in Vercel.",
    });
  }

  const geoapifyUrl = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  geoapifyUrl.searchParams.set("text", query);
  geoapifyUrl.searchParams.set("filter", "countrycode:be");
  geoapifyUrl.searchParams.set("bias", "proximity:4.4025,51.2194");
  geoapifyUrl.searchParams.set("limit", "5");
  geoapifyUrl.searchParams.set("lang", "nl");
  geoapifyUrl.searchParams.set("apiKey", apiKey);

  let response: Response;

  try {
    response = await fetch(geoapifyUrl, {
      cache: "no-store",
    });
  } catch {
    return Response.json({
      suggestions: [],
      error: "Geoapify is niet bereikbaar. Probeer later opnieuw.",
    });
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return Response.json({
        suggestions: [],
        error: "Geoapify API key is ongeldig of heeft geen toegang tot autocomplete.",
      });
    }

    return Response.json({
      suggestions: [],
      error: `Suggesties ophalen lukte niet. Geoapify gaf status ${response.status}.`,
    });
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    return Response.json({
      suggestions: [],
      error: "Geoapify gaf een onverwacht antwoord terug.",
    });
  }
  type GeoapifyFeature = {
    properties?: {
      place_id?: string;
      formatted?: string;
      address_line1?: string;
      category?: string;
      result_type?: string;
      name?: string;
    };
    geometry?: {
      coordinates?: [number, number];
    };
  };

  const featureCollection = data as { features?: GeoapifyFeature[] };
  const features: GeoapifyFeature[] = Array.isArray(featureCollection.features) ? featureCollection.features : [];

  return Response.json({
    provider: "geoapify",
    suggestions: features
      .map((feature: GeoapifyFeature) => {
        const properties = feature?.properties;
        const coordinates = feature?.geometry?.coordinates;

        if (!properties?.formatted || !Array.isArray(coordinates)) {
          return null;
        }

        return {
          placeId: properties.place_id,
          label: properties.formatted,
          name: properties.name ?? properties.address_line1 ?? properties.formatted,
          type: mapGeoapifyCategoryToPlaceType(properties.category),
          latitude: Number(coordinates[1]),
          longitude: Number(coordinates[0]),
        };
      })
      .filter(Boolean),
  });
}
