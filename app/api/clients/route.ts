import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clientService } from "@/services/clientService";
import { createClientSchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

// GET /api/clients — visible to everyone (Employees pick a client to view its delivery calendar)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await clientService.list();
  return NextResponse.json({ items });
}

// POST /api/clients — Admin/Super Admin create a new client (and its calendar)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_CLIENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const client = await clientService.create({
      ...parsed.data,
      createdBy: session.user.id as string,
      createdByName: session.user.name ?? "Admin",
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create client" }, { status: 400 });
  }
}
