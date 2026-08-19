import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { meetingService } from "@/services/meetingService";

// GET /api/meetings/calendar - all meetings I'm involved in, unfiltered by
// date (the calendar widget does its own month/week windowing client-side,
// same pattern as the Tasks and Work Log calendars).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await meetingService.listForUser(session.user.id as string);
  return NextResponse.json({ items });
}
