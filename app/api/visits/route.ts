import { saveVisitorEvent } from "@/lib/visitorDatabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    sessionId?: string;
    path?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    language?: string;
    timezone?: string;
    viewportWidth?: number;
    viewportHeight?: number;
    latitude?: number | null;
    longitude?: number | null;
  } | null;

  if (!body?.sessionId) {
    return Response.json({ error: "Sessie ontbreekt." }, { status: 400 });
  }

  try {
    const visit = await saveVisitorEvent({
      ...body,
      sessionId: body.sessionId,
    });
    return Response.json({ visit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("DATABASE_NOT_CONFIGURED")) {
      return Response.json({ ok: false, error: "Bezoekersdatabase is niet geconfigureerd." }, { status: 202 });
    }

    return Response.json({ error: "Bezoek opslaan is mislukt." }, { status: 500 });
  }
}
