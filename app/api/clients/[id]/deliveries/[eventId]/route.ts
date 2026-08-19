import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deliveryEventService } from "@/services/deliveryEventService";
import { updateDeliveryEventSchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

// PATCH /api/clients/:id/deliveries/:eventId
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_CLIENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;
  const body = await req.json();
  const parsed = updateDeliveryEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await deliveryEventService.update(eventId, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/clients/:id/deliveries/:eventId
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_CLIENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;
  await deliveryEventService.delete(eventId);
  return NextResponse.json({ success: true });
}
