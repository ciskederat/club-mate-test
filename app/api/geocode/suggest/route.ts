export async function GET(request: Request) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return Response.json({
      suggestions: [],
      error: "Adres-suggesties zijn nog niet ingesteld. Voeg GEOAPIFY_API_KEY toe in Vercel.",
    });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return Response.json({ suggestions: [] });
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
      formatted?: string;
    };
    geometry?: {
      coordinates?: [number, number];
    };
  };

  const featureCollection = data as { features?: GeoapifyFeature[] };
  const features: GeoapifyFeature[] = Array.isArray(featureCollection.features) ? featureCollection.features : [];

  return Response.json({
    suggestions: features
      .map((feature: GeoapifyFeature) => {
        const properties = feature?.properties;
        const coordinates = feature?.geometry?.coordinates;

        if (!properties?.formatted || !Array.isArray(coordinates)) {
          return null;
        }

        return {
          label: properties.formatted,
          latitude: Number(coordinates[1]),
          longitude: Number(coordinates[0]),
        };
      })
      .filter(Boolean),
  });
}
