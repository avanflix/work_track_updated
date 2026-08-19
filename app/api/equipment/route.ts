import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { equipmentService } from "@/services/equipmentService";
import { createEquipmentSchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

// GET /api/equipment?all=1 — everyone can view the catalog (needed to build a shoot log);
// `all=1` (Admin/Super Admin only) also includes retired items for the management view.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const wantsAll = searchParams.get("all") === "1";
  const includeInactive = wantsAll && can(role, "MANAGE_EQUIPMENT");

  const items = await equipmentService.list(includeInactive);
  return NextResponse.json({ items });
}

// POST /api/equipment — Admin/Super Admin add a new item to the catalog
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_EQUIPMENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createEquipmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await equipmentService.create({
    ...parsed.data,
    createdBy: session.user.id as string,
    createdByName: session.user.name ?? "Admin",
  });

  return NextResponse.json(item, { status: 201 });
}
