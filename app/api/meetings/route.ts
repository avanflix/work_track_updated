import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { meetingService } from "@/services/meetingService";
import { createMeetingSchema } from "@/lib/validations";

// GET /api/meetings - meetings where I'm the organizer or an invitee.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const items = await meetingService.listForUser(session.user.id as string, {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  return NextResponse.json({ items });
}

// POST /api/meetings - schedule a meeting. Any active user can organize one
// and invite any other active user(s) — same "message anyone" philosophy as chat.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const meeting = await meetingService.create({
      ...parsed.data,
      organizer: session.user.id as string,
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not schedule meeting" }, { status: 400 });
  }
}
