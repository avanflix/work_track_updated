import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { holidayService } from "@/services/holidayService";
import { can } from "@/utils/permissions";

// DELETE /api/holidays/:id — Super Admin only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_HOLIDAYS")) {
    return NextResponse.json({ error: "Only Super Admin can remove holidays" }, { status: 403 });
  }

  const { id } = await params;
  await holidayService.delete(id);
  return NextResponse.json({ success: true });
}
