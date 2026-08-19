import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callService } from "@/services/callService";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;

  try {
    const call = await callService.acceptCall(roomId, session.user.id as string);
    return NextResponse.json(call);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not accept call" }, { status: 400 });
  }
}
