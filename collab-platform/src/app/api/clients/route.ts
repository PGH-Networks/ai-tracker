import { NextResponse } from "next/server";
import { AccessError, requireUser } from "@/lib/rbac";
import { createClient, listClients } from "@/lib/data/clients";

// GET /api/clients — RBAC-scoped list (staff: all, client: own only)
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listClients(user));
  } catch (e) {
    return handle(e);
  }
}

// POST /api/clients — staff only
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const created = await createClient(user, body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return handle(e);
  }
}

function handle(e: unknown) {
  if (e instanceof AccessError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
