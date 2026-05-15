const isValidAdminPin = (pin: unknown) =>
  typeof pin === "string" && Boolean(process.env.ADMIN_PIN) && pin.trim() === process.env.ADMIN_PIN?.trim();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isValidAdminPin(body?.pin)) {
    return Response.json({ error: "Code klopt niet." }, { status: 401 });
  }

  return Response.json({ ok: true });
}
