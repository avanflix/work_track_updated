import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callService } from "@/services/callService";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const calls = await callService.listIncomingForUser(session.user.id as string);

  await connectDB();
  const callerIds = calls.map((c: any) => c.initiator.toString());
  const callers = await User.find({ _id: { $in: callerIds } }, "name role department").lean();
  const callerMap = new Map(callers.map((u: any) => [u._id.toString(), u]));

  const items = calls.map((c: any) => ({
    ...c,
    caller: callerMap.get(c.initiator.toString()),
  }));

  return NextResponse.json({ items });
}
