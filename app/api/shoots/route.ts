import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shootLogService } from "@/services/shootLogService";
import { createShootLogSchema } from "@/lib/validations";
import { can, getWorkLogVisibleRoles } from "@/utils/permissions";

// GET /api/shoots?scope=mine|team
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = session.user.id as string;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "mine";

  if (scope === "team") {
    if (getWorkLogVisibleRoles(role).length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const items = await shootLogService.listTeam(role);
    return NextResponse.json({ items });
  }

  const items = await shootLogService.listMine(userId);
  return NextResponse.json({ items });
}

// POST /api/shoots — Employees and Admins can log equipment taken for a shoot
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "CREATE_SHOOT_LOG")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createShootLogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const log = await shootLogService.create({
      ...parsed.data,
      takenBy: { id: session.user.id as string, name: session.user.name ?? "User", role },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create shoot log" }, { status: 400 });
  }
}
