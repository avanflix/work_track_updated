import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { meetingService } from "@/services/meetingService";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meeting = await meetingService.findById(id);
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id as string;
  const isInvolved =
    (meeting as any).organizer.toString() === userId ||
    (meeting as any).participants.some((p: any) => p.toString() === userId);
  if (!isInvolved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(meeting);
}

// PATCH /api/meetings/[id] - organizer-only cancel.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.status !== "CANCELLED") {
    return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
  }

  try {
    const meeting = await meetingService.cancel(id, session.user.id as string);
    return NextResponse.json(meeting);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not cancel meeting" }, { status: 400 });
  }
}
