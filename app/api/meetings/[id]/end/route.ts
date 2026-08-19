import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { meetingService } from "@/services/meetingService";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const meeting = await meetingService.endMeeting(id, session.user.id as string);
    return NextResponse.json(meeting);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not end meeting" }, { status: 400 });
  }
}
