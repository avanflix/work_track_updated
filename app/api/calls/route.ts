import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callService } from "@/services/callService";
import { startDirectCallSchema } from "@/lib/validations";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

// POST /api/calls - place a 1:1 call. Any active user can call any other
// active user, same as chat — this just rings them.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`start-call:${getClientKey(req)}:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many call attempts, slow down." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = startDirectCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const call = await callService.startDirectCall({
      initiatorId: session.user.id as string,
      targetUserId: parsed.data.targetUserId,
      callType: parsed.data.callType,
      conversationId: parsed.data.conversationId,
    });
    return NextResponse.json(call, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not start call" }, { status: 400 });
  }
}
