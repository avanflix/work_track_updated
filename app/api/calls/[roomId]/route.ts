import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callService } from "@/services/callService";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await params;
  const userId = session.user.id as string;

  const call = await callService.getById(roomId);
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = (call as any).participants.some((p: any) => p.user.toString() === userId);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const userIds = (call as any).participants.map((p: any) => p.user.toString());
  const users = await User.find({ _id: { $in: userIds } }, "name role department").lean();
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

  const participants = (call as any).participants.map((p: any) => ({
    ...p,
    user: userMap.get(p.user.toString()) ?? { _id: p.user },
  }));

  return NextResponse.json({ ...call, participants });
}
