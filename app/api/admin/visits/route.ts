import { getVisitorEvents, isVisitorDatabaseConfigured } from "@/lib/visitorDatabase";

const isValidAdminPin = (request: Request) => {
  const pin = request.headers.get("x-admin-pin");
  return Boolean(process.env.ADMIN_PIN) && pin?.trim() === process.env.ADMIN_PIN?.trim();
};

export async function GET(request: Request) {
  if (!isValidAdminPin(request)) {
    return Response.json({ error: "Niet toegelaten." }, { status: 401 });
  }

  try {
    const visits = await getVisitorEvents();

    return Response.json({
      visits,
      databaseConfigured: isVisitorDatabaseConfigured(),
    });
  } catch {
    return Response.json({ error: "Bezoekers ophalen is mislukt." }, { status: 500 });
  }
}
