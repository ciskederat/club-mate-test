import type { MateReportStatus, Place } from "@/data/placeTypes";
import { reportMateStatus } from "@/lib/placesDatabase";

const isMateReportStatus = (value: unknown): value is MateReportStatus =>
  value === "present" || value === "absent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    place?: Place;
    status?: unknown;
  } | null;

  if (!body?.place || !isMateReportStatus(body.status)) {
    return Response.json({ error: "Melding is ongeldig." }, { status: 400 });
  }

  try {
    const result = await reportMateStatus(body.place, body.status);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("DATABASE_NOT_CONFIGURED")) {
      return Response.json(
        { error: "Database is niet geconfigureerd. Voeg Supabase env vars toe om meldingen op te slaan." },
        { status: 500 },
      );
    }

    if (message.includes("consecutive_absent_count")) {
      return Response.json(
        { error: "Database mist consecutive_absent_count. Voer eerst de Supabase migratie uit." },
        { status: 500 },
      );
    }

    if (message.includes("PGRST204") || message.includes("schema cache")) {
      return Response.json(
        { error: "Supabase schema-cache is nog niet bijgewerkt. Herlaad de schema-cache of herstart de API." },
        { status: 500 },
      );
    }

    if (message.includes("PLACE_NOT_FOUND")) {
      return Response.json(
        { error: "Deze locatie bestaat niet meer in de database. Vernieuw de pagina." },
        { status: 404 },
      );
    }

    return Response.json({ error: "Melding opslaan is mislukt." }, { status: 500 });
  }
}
