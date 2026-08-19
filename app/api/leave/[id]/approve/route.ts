import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { leaveService } from "@/services/leaveService";
import { settingsService } from "@/services/settingsService";
import { notificationService } from "@/services/notificationService";
import { leaveReviewSchema } from "@/lib/validations";

async function canDecide(
  userId: string,
  role: string
) {
  if (role === "SUPER_ADMIN") {
    return true;
  }

  if (role !== "ADMIN") {
    return false;
  }

  const settings = await settingsService.get();

  return (
    (settings as any)?.leaveApprover?.toString() ===
    userId
  );
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as any).role;
    const userId = session.user.id as string;

    const { id } = await params;

    /**
     * Only the configured Admin approver or
     * Super Admin can approve.
     */
    if (!(await canDecide(userId, role))) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to approve leave requests",
        },
        { status: 403 }
      );
    }

    const request =
      await leaveService.findById(id);

    if (!request) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    /**
     * Only pending requests can be approved.
     */
    if ((request as any).status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "This leave request has already been processed",
        },
        { status: 400 }
      );
    }

    /**
     * Validate optional review note.
     */
    const body = await req
      .json()
      .catch(() => ({}));

    const parsed =
      leaveReviewSchema
        .pick({
          reviewNote: true,
        })
        .safeParse(body);

    /**
     * Approval reviewer.
     */
    const reviewer = {
      id: userId,
      name:
        session.user.name ??
        "Admin",
    };

    /**
     * Approve the request.
     *
     * leaveService handles:
     * - future leave
     * - current leave
     * - availability
     * - timestamps
     * - overlap handling
     */
    const updated =
      await leaveService.decide(
        id,
        "APPROVED",
        reviewer,
        parsed.success
          ? parsed.data.reviewNote
          : undefined
      );

    /**
     * Notify employee.
     */
    await notificationService.create({
      recipient:
        (request as any).requestedBy.toString(),

      title:
        "Leave request approved",

      message:
        `${reviewer.name} approved your leave request`,

      type:
        "LEAVE_REVIEWED",
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Approve leave error:",
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to approve leave request";

    const isBusinessError =
      message.includes("older pending") ||
      message.includes("cannot be") ||
      message.includes("overlap");

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: isBusinessError
          ? 400
          : 500,
      }
    );
  }
}