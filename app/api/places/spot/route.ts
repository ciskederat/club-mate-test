import type { Place } from "@/data/placeTypes";
import { getPlaces, savePlace } from "@/lib/placesDatabase";

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    type?: Place["type"];
    hours?: Place["hours"];
    info?: string;
  } | null;

  if (!body?.name || !Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
    return Response.json({ error: "Locatiegegevens ontbreken." }, { status: 400 });
  }

  const places = await getPlaces();
  const existingPlace = places.find((place) => normalizeText(place.name) === normalizeText(body.name ?? ""));
  const extraInfo = body.info?.trim();
  const mergedInfo = extraInfo
    ? existingPlace?.info && !existingPlace.info.includes(extraInfo)
      ? `${existingPlace.info}\n\nExtra melding: ${extraInfo}`
      : extraInfo
    : existingPlace?.info ?? "Club Mate gespot";

  const place = await savePlace({
    id: existingPlace?.id,
    previousName: existingPlace?.name,
    place: {
      id: existingPlace?.id,
      name: body.name.trim(),
      address: body.address?.trim() || existingPlace?.address || "",
      position: [Number(body.latitude), Number(body.longitude)],
      type: body.type ?? existingPlace?.type ?? "shop",
      info: mergedInfo,
      hours: body.hours?.length ? body.hours : existingPlace?.hours ?? [],
      presentCount: existingPlace?.presentCount ?? 0,
      absentCount: existingPlace?.absentCount ?? 0,
      lastReportStatus: existingPlace?.lastReportStatus,
      lastReportedAt: existingPlace?.lastReportedAt,
    },
  }).catch(() => null);

  if (!place) {
    return Response.json({ error: "Locatie opslaan is mislukt." }, { status: 500 });
  }

  return Response.json({ place });
}
