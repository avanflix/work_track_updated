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

  const settings =
    await settingsService.get();

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

    const role =
      (session.user as any).role;

    const userId =
      session.user.id as string;

    const { id } = await params;

    /**
     * Only the configured Admin approver
     * or Super Admin can reject.
     */
    if (!(await canDecide(userId, role))) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to reject leave requests",
        },
        { status: 403 }
      );
    }

    const request =
      await leaveService.findById(id);

    if (!request) {
      return NextResponse.json(
        {
          error:
            "Leave request not found",
        },
        { status: 404 }
      );
    }

    /**
     * Only pending requests can be rejected.
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

    const body = await req
      .json()
      .catch(() => ({}));

    const parsed =
      leaveReviewSchema
        .pick({
          reviewNote: true,
        })
        .safeParse(body);

    const reviewer = {
      id: userId,
      name:
        session.user.name ??
        "Admin",
    };

    const updated =
      await leaveService.decide(
        id,
        "REJECTED",
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
        "Leave request rejected",

      message:
        `${reviewer.name} rejected your leave request`,

      type:
        "LEAVE_REVIEWED",
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "Reject leave error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reject leave request",
      },
      { status: 500 }
    );
  }
}