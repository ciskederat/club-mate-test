import { getPlaces, isDatabaseConfigured } from "@/lib/placesDatabase";

export async function GET() {
  const places = await getPlaces();

  return Response.json({
    places,
    databaseConfigured: isDatabaseConfigured(),
  });
}
