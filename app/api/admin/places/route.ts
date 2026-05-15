import type { Place } from "@/data/placeTypes";
import { deletePlace, savePlace, updateReportCounts } from "@/lib/placesDatabase";

const isValidAdminPin = (request: Request) => {
  const pin = request.headers.get("x-admin-pin");
  return Boolean(process.env.ADMIN_PIN) && pin?.trim() === process.env.ADMIN_PIN?.trim();
};

export async function POST(request: Request) {
  if (!isValidAdminPin(request)) {
    return Response.json({ error: "Niet toegelaten." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    place?: Place;
    previousName?: string;
  } | null;

  if (!body?.place) {
    return Response.json({ error: "Locatie ontbreekt." }, { status: 400 });
  }

  const place = await savePlace({
    id: body.place.id,
    previousName: body.previousName,
    place: body.place,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("places_type_check") || message.includes("check constraint")) {
      throw new Error("Database laat type 'other' nog niet toe. Voer de Supabase type-migratie uit.");
    }

    throw error;
  }).catch((error) => error);

  if (place instanceof Error) {
    return Response.json({ error: place.message || "Database opslaan is mislukt." }, { status: 500 });
  }

  return Response.json({ place });
}

export async function PATCH(request: Request) {
  if (!isValidAdminPin(request)) {
    return Response.json({ error: "Niet toegelaten." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    place?: Place;
    presentCount?: number;
    absentCount?: number;
  } | null;

  if (!body?.place) {
    return Response.json({ error: "Locatie ontbreekt." }, { status: 400 });
  }

  const place = await updateReportCounts(
    body.place,
    Number(body.presentCount ?? body.place.presentCount ?? 0),
    Number(body.absentCount ?? body.place.absentCount ?? 0),
  ).catch(() => null);

  if (!place) {
    return Response.json({ error: "Tellers aanpassen is mislukt." }, { status: 500 });
  }

  return Response.json({ place });
}

export async function DELETE(request: Request) {
  if (!isValidAdminPin(request)) {
    return Response.json({ error: "Niet toegelaten." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    place?: Place;
  } | null;

  if (!body?.place) {
    return Response.json({ error: "Locatie ontbreekt." }, { status: 400 });
  }

  const deleted = await deletePlace(body.place)
    .then(() => true)
    .catch(() => false);

  if (!deleted) {
    return Response.json({ error: "Locatie verwijderen is mislukt." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
