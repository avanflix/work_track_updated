import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callService } from "@/services/callService";
import { callSignalSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const userId = session.user.id as string;

  const member = await callService.isParticipant(roomId, userId);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const since = new URL(req.url).searchParams.get("since") ?? undefined;
  const items = await callService.listSignalsSince(roomId, userId, since);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const userId = session.user.id as string;

  const member = await callService.isParticipant(roomId, userId);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = callSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const signal = await callService.sendSignal({
    callId: roomId,
    from: userId,
    to: parsed.data.to,
    type: parsed.data.type,
    payload: parsed.data.payload,
  });

  return NextResponse.json(signal, { status: 201 });
}
