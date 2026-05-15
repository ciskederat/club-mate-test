export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return Response.json({ error: "Adres ontbreekt." }, { status: 400 });
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", query);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("limit", "1");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("countrycodes", "be");

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "mate-alert/1.0 contact:admin",
      Referer: "https://mate-alert.vercel.app",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return Response.json({ error: "Adres zoeken is tijdelijk niet beschikbaar." }, { status: 502 });
  }

  const results = await response.json();
  const firstResult = Array.isArray(results) ? results[0] : null;

  if (!firstResult?.lat || !firstResult?.lon) {
    return Response.json({ error: "Geen locatie gevonden voor dit adres." }, { status: 404 });
  }

  return Response.json({
    latitude: Number(firstResult.lat),
    longitude: Number(firstResult.lon),
    label: firstResult.display_name,
  });
}
