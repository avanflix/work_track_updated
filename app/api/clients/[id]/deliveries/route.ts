import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deliveryEventService } from "@/services/deliveryEventService";
import { createDeliveryEventSchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

// GET /api/clients/:id/deliveries?year=2026&month=8 — visible to everyone
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const items = await deliveryEventService.list(id, {
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
  });
  return NextResponse.json({ items });
}

// POST /api/clients/:id/deliveries — Admin/Super Admin add a delivery date
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_CLIENTS")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = createDeliveryEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const event = await deliveryEventService.create({
    ...parsed.data,
    client: id,
    createdBy: session.user.id as string,
    createdByName: session.user.name ?? "Admin",
  });
  return NextResponse.json(event, { status: 201 });
}
