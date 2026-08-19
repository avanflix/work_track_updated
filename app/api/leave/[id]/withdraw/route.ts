import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { leaveService } from "@/services/leaveService";
import { settingsService } from "@/services/settingsService";
import { notificationService } from "@/services/notificationService";
import { userService } from "@/services/userService";

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

    const userId =
      session.user.id as string;

    const { id } = await params;

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
     * Only the requester can withdraw
     * their own leave.
     */
    if (
      String(
        (request as any).requestedBy
      ) !== String(userId)
    ) {
      return NextResponse.json(
        {
          error:
            "You can only withdraw your own leave request",
        },
        { status: 403 }
      );
    }

    /**
     * Read optional withdrawal reason.
     */
    const body = await req
      .json()
      .catch(() => ({}));

    const withdrawReason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : undefined;

    const previousStatus =
      (request as any).status;

    /**
     * Withdraw the request.
     *
     * Supports:
     *
     * PENDING  -> WITHDRAWN
     * APPROVED -> WITHDRAWN
     */
    const updated =
      await leaveService.withdraw(
        id,
        userId,
        withdrawReason
      );

    /**
     * Notify Super Admins and the
     * configured leave approver.
     */
    const settings =
      await settingsService.get();

    const admins =
      await userService.listAdmins();

    const recipients =
      new Set<string>();

    for (const admin of admins as any[]) {
      if (
        admin.role ===
        "SUPER_ADMIN"
      ) {
        recipients.add(
          admin._id.toString()
        );
      }
    }

    const approverId =
      (settings as any)
        ?.leaveApprover
        ?.toString();

    if (approverId) {
      recipients.add(
        approverId
      );
    }

    /**
     * Do not notify the employee
     * who withdrew their own leave.
     */
    recipients.delete(userId);

    const requesterName =
      (request as any)
        .requestedByName ??
      session.user.name ??
      "Employee";

    await Promise.all(
      Array.from(recipients).map(
        (recipientId) =>
          notificationService.create({
            recipient:
              recipientId,

            title:
              "Leave request withdrawn",

            message:
              `${requesterName} withdrew their ${previousStatus.toLowerCase()} leave request`,

            type:
              "LEAVE_WITHDRAWN",
          })
      )
    );

    return NextResponse.json(
      updated
    );
  } catch (error) {
    console.error(
      "Withdraw leave error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to withdraw leave request";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message.includes(
            "cannot be withdrawn"
          ) ||
          message.includes(
            "only withdraw"
          )
            ? 400
            : 500,
      }
    );
  }
}