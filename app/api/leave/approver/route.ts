import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { settingsService } from "@/services/settingsService";
import { userService } from "@/services/userService";
import { setLeaveApproverSchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

// GET /api/leave/approver — any Admin/Super Admin can see who's currently designated
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await settingsService.get();
  return NextResponse.json({
    leaveApprover: (settings as any)?.leaveApprover?.toString() ?? null,
    leaveApproverName: (settings as any)?.leaveApproverName ?? null,
  });
}

// PATCH /api/leave/approver — Super Admin picks one Admin who can approve leave alongside them
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "SET_LEAVE_APPROVER")) {
    return NextResponse.json({ error: "Only Super Admin can set the leave approver" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = setLeaveApproverSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = await userService.findById(parsed.data.adminId);
  if (!admin || (admin as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Selected user must be an Admin" }, { status: 400 });
  }

  const updated = await settingsService.setLeaveApprover(parsed.data.adminId, (admin as any).name);
  return NextResponse.json({
    leaveApprover: (updated as any)?.leaveApprover?.toString() ?? null,
    leaveApproverName: (updated as any)?.leaveApproverName ?? null,
  });
}
