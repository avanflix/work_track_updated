import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { leaveService } from "@/services/leaveService";
import { settingsService } from "@/services/settingsService";
import { notificationService } from "@/services/notificationService";
import { leaveRequestSchema } from "@/lib/validations";
import { can } from "@/utils/permissions";

/**
 * Can this user decide leave requests?
 *
 * SUPER_ADMIN:
 *   Always allowed.
 *
 * ADMIN:
 *   Only the configured leave approver.
 */
async function isLeaveApprover(
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

/**
 * Admin and Super Admin can view team leave
 * information.
 *
 * Employees can only view their own leave.
 */
function canViewTeamLeaves(role: string) {
  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

/**
 * GET /api/leave
 *
 * Supported scopes:
 *
 * pending
 * mine
 * current
 * upcoming
 * all
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } =
      new URL(req.url);

    const approver =
      await isLeaveApprover(
        userId,
        role
      );

    /**
     * If no scope is provided:
     *
     * Approver -> pending
     * Employee -> mine
     * Admin/Super Admin -> current + upcoming
     */
    const requestedScope =
      searchParams.get("scope");

    const scope =
      requestedScope ??
      (approver
        ? "pending"
        : canViewTeamLeaves(role)
          ? "all"
          : "mine");

    // ----------------------------------------
    // MY LEAVES
    // ----------------------------------------

    if (scope === "mine") {
      const items =
        await leaveService.listMine(
          userId
        );

      return NextResponse.json({
        items,
      });
    }

    // ----------------------------------------
    // PENDING LEAVES
    // ----------------------------------------

    if (scope === "pending") {
      if (!approver) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to view pending leave requests",
          },
          { status: 403 }
        );
      }

      const items =
        await leaveService.listPending();

      return NextResponse.json({
        items,
      });
    }

    // ----------------------------------------
    // CURRENT LEAVES
    // ----------------------------------------

    if (scope === "current") {
      if (!canViewTeamLeaves(role)) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to view team leaves",
          },
          { status: 403 }
        );
      }

      const items =
        await leaveService.listCurrentLeaves();

      return NextResponse.json({
        items,
      });
    }

    // ----------------------------------------
    // UPCOMING LEAVES
    // ----------------------------------------

    if (scope === "upcoming") {
      if (!canViewTeamLeaves(role)) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to view upcoming leaves",
          },
          { status: 403 }
        );
      }

      const items =
        await leaveService.listUpcomingLeaves();

      return NextResponse.json({
        items,
      });
    }

    // ----------------------------------------
    // CURRENT + FUTURE
    // ----------------------------------------

    if (scope === "all") {
      if (!canViewTeamLeaves(role)) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to view team leaves",
          },
          { status: 403 }
        );
      }

      const items =
        await leaveService.listActiveAndUpcomingLeaves();

      return NextResponse.json({
        items,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid leave scope",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "GET /api/leave error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch leave requests",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leave
 *
 * Employee/Admin can request leave.
 * Super Admin does not submit leave requests.
 */
export async function POST(
  req: NextRequest
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

    if (!can(role, "REQUEST_LEAVE")) {
      return NextResponse.json(
        {
          error:
            "Super Admin does not submit leave requests",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const parsed =
      leaveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const requester = {
      id: session.user.id as string,
      name:
        session.user.name ??
        "User",
      role,
      department:
        (session.user as any)
          .department,
    };

    const request =
      await leaveService.create({
        ...parsed.data,
        requester,
      });

    /**
     * Notify:
     *
     * - Every Super Admin
     * - Configured leave approver
     *
     * Do not notify the requester.
     */
    const settings =
      await settingsService.get();

    const { userService } =
      await import(
        "@/services/userService"
      );

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

    recipients.delete(
      requester.id
    );

    await Promise.all(
      Array.from(recipients).map(
        (recipientId) =>
          notificationService.create({
            recipient:
              recipientId,

            title:
              "Leave request awaiting approval",

            message:
              `${requester.name} requested leave from ${parsed.data.leaveFrom} to ${parsed.data.leaveTo}`,

            type:
              "LEAVE_REQUESTED",
          })
      )
    );

    return NextResponse.json(
      request,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/leave error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create leave request",
      },
      { status: 500 }
    );
  }
}