import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shootLogService } from "@/services/shootLogService";
import { returnShootLogSchema } from "@/lib/validations";
import { canViewShootLogOf } from "@/utils/permissions";

// PATCH /api/shoots/:id/return — mark the checked-out equipment as returned
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = session.user.id as string;
  const { id } = await params;

  const log = await shootLogService.findById(id);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((log as any).status === "RETURNED") {
    return NextResponse.json({ error: "This log has already been marked as returned" }, { status: 400 });
  }

  const canUpdate = canViewShootLogOf(role, userId, (log as any).takenBy.toString(), (log as any).takenByRole);
  if (!canUpdate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = returnShootLogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await shootLogService.markReturned(id, parsed.data);
  return NextResponse.json(updated);
}
