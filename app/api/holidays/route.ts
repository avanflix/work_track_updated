import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { holidayService } from "@/services/holidayService";
import { notificationService } from "@/services/notificationService";
import { userService } from "@/services/userService";
import { createHolidaySchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

// GET /api/holidays?year=2026&month=8 — visible to everyone (Super Admin, Admin, Employee)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const items = await holidayService.list({
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
  });

  return NextResponse.json({ items });
}

// POST /api/holidays — Super Admin only, added directly (no approval step)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_HOLIDAYS")) {
    return NextResponse.json({ error: "Only Super Admin can add holidays" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createHolidaySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const holiday = await holidayService.create({
    ...parsed.data,
    createdBy: session.user.id as string,
    createdByName: session.user.name ?? "Super Admin",
  });

  // Let everyone know a new holiday has been added to the calendar.
  const [admins, employees] = await Promise.all([
    userService.listAdmins(),
    userService.list({ role: "EMPLOYEE", isActive: true, limit: 1000 }),
  ]);
  const recipients = new Set<string>([
    ...admins.map((a: any) => a._id.toString()),
    ...employees.items.map((e: any) => e._id.toString()),
  ]);
  recipients.delete(session.user.id as string);

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      notificationService.create({
        recipient: recipientId,
        title: "New holiday added",
        message: `${holiday.title} has been added to the holiday calendar`,
        type: "HOLIDAY_ADDED",
      })
    )
  );

  return NextResponse.json(holiday, { status: 201 });
}
