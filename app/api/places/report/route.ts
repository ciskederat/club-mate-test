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

  const place = await reportMateStatus(body.place, body.status).catch(() => null);

  if (!place) {
    return Response.json({ error: "Melding opslaan is mislukt." }, { status: 500 });
  }

  return Response.json({ place });
}
