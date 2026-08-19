import { connectDB } from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";
import type { UserRole } from "@/types";

/**
 * Normalize any date to UTC midnight.
 * Leave dates are treated as inclusive calendar dates.
 */
function startOfDay(input: Date | string) {
  const date = new Date(input);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

function endOfDayExclusive(input: Date | string) {
  const date = startOfDay(input);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

/**
 * Recalculate availability from ALL approved leaves.
 *
 * This prevents incorrect availability when multiple leaves overlap.
 *
 * Example:
 * Leave A: 25-27
 * Leave B: 26-30
 *
 * If Leave A is withdrawn on 26,
 * the employee must still remain ON_LEAVE
 * because Leave B is still active.
 */
async function reconcileUserLeaveAvailability(userId: string) {
  const today = startOfDay(new Date());

  const activeLeave = await LeaveRequest.findOne({
    requestedBy: userId,
    status: "APPROVED",
    leaveFrom: {
      $lte: today,
    },
    leaveTo: {
      $gte: today,
    },
  })
    .sort({
      leaveFrom: -1,
      reviewedAt: -1,
      createdAt: -1,
    })
    .lean();

  const user = await User.findById(userId)
    .select("isActive")
    .lean();

  if (!user) {
    return;
  }

  /**
   * There is an approved leave covering today.
   */
  if (activeLeave) {
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          leaveFrom: activeLeave.leaveFrom,
          leaveTo: activeLeave.leaveTo,
          leaveReason: activeLeave.reason,

          availabilityStatus: "ON_LEAVE",
          availability: "ON_LEAVE",
        },
      }
    );

    return;
  }

  /**
   * No approved leave is active today.
   *
   * Future approved leaves must NOT make
   * the user unavailable today.
   *
   * Expired leaves are also cleared here.
   */
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        leaveFrom: null,
        leaveTo: null,
        leaveReason: "",

        availabilityStatus: user.isActive
          ? "ACTIVE"
          : "INACTIVE",

        availability: user.isActive
          ? "AVAILABLE"
          : "INACTIVE",
      },
    }
  );
}

export const leaveService = {
  /**
   * Create a leave request.
   *
   * New requests are always PENDING.
   */
  async create(input: {
    leaveFrom: string;
    leaveTo: string;
    reason: string;
    requester: {
      id: string;
      name: string;
      role: UserRole;
      department?: string;
    };
  }) {
    await connectDB();

    const leaveFrom = startOfDay(input.leaveFrom);
    const leaveTo = startOfDay(input.leaveTo);

    if (leaveFrom > leaveTo) {
      throw new Error(
        "Leave start date cannot be after leave end date."
      );
    }

    if (!input.reason?.trim()) {
      throw new Error("Leave reason is required.");
    }

    const request = await LeaveRequest.create({
      requestedBy: input.requester.id,
      requestedByName: input.requester.name,
      requestedByRole: input.requester.role,
      department: input.requester.department,

      leaveFrom,
      leaveTo,

      reason: input.reason.trim(),

      status: "PENDING",
    });

    return request.toObject();
  },

  /**
   * Find one leave request.
   *
   * NOTE: intentionally does NOT populate requestedBy/reviewedBy/withdrawnBy.
   * Callers (approve/reject/withdraw routes) rely on these staying raw
   * ObjectIds for ownership checks (`String(request.requestedBy) === userId`)
   * and notification targeting (`request.requestedBy.toString()`) — a
   * populated sub-object stringifies to "[object Object]" and silently
   * breaks both. Display already has requestedByName/reviewedByName
   * denormalized onto the document, so populating buys nothing here.
   */
  async findById(id: string) {
    await connectDB();

    return LeaveRequest.findById(id).lean();
  },

  /**
   * All leave requests belonging to the current user.
   *
   * Newest request first.
   */
  async listMine(userId: string) {
    await connectDB();

    return LeaveRequest.find({
      requestedBy: userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  },

  /**
   * Pending approval queue.
   *
   * IMPORTANT:
   * Oldest request appears first.
   *
   * This is also the order enforced
   * during approval/rejection.
   */
  async listPending() {
    await connectDB();

    return LeaveRequest.find({
      status: "PENDING",
    })
      .sort({
        createdAt: 1,
      })
      .lean();
  },

  /**
   * Get approved leaves for one employee/admin.
   *
   * Used by the Work Log calendar.
   *
   * Example:
   *
   * Approved leave: 25-27
   * Calendar range: 26-30
   *
   * The leave is returned because
   * the two ranges overlap.
   */
  async listApprovedForUser(
    userId: string,
    startDate?: string,
    endDate?: string
  ) {
    await connectDB();

    const filter: Record<string, any> = {
      requestedBy: userId,
      status: "APPROVED",
    };

    if (startDate || endDate) {
      const rangeStart = startOfDay(
        startDate ?? endDate!
      );

      const rangeEnd = endOfDayExclusive(
        endDate ?? startDate!
      );

      /**
       * Overlap:
       *
       * leaveFrom < rangeEnd
       * AND
       * leaveTo >= rangeStart
       */
      filter.leaveFrom = {
        $lt: rangeEnd,
      };

      filter.leaveTo = {
        $gte: rangeStart,
      };
    }

    return LeaveRequest.find(filter)
      .sort({
        leaveFrom: 1,
        reviewedAt: 1,
        createdAt: 1,
      })
      .lean();
  },

  /**
   * Current approved leaves.
   *
   * Example:
   *
   * Today = 25 Aug
   * Leave = 25-27 Aug
   *
   * Returned.
   */
  async listCurrentLeaves() {
    await connectDB();

    const today = startOfDay(new Date());

    return LeaveRequest.find({
      status: "APPROVED",
      leaveFrom: {
        $lte: today,
      },
      leaveTo: {
        $gte: today,
      },
    })
      .sort({
        leaveFrom: 1,
        reviewedAt: 1,
        createdAt: 1,
      })
      .lean();
  },

  /**
   * Future approved leaves.
   *
   * Only leaves beginning after today.
   */
  async listUpcomingLeaves() {
    await connectDB();

    const today = startOfDay(new Date());

    return LeaveRequest.find({
      status: "APPROVED",
      leaveFrom: {
        $gt: today,
      },
    })
      .sort({
        leaveFrom: 1,
        reviewedAt: 1,
        createdAt: 1,
      })
      .lean();
  },

  /**
   * Current + future approved leaves.
   *
   * Used by Admin/Super Admin
   * availability/team views.
   */
  async listActiveAndUpcomingLeaves() {
    await connectDB();

    const today = startOfDay(new Date());

    return LeaveRequest.find({
      status: "APPROVED",
      leaveTo: {
        $gte: today,
      },
    })
      .sort({
        leaveFrom: 1,
        reviewedAt: 1,
        createdAt: 1,
      })
      .lean();
  },

  /**
   * Approve or reject a pending request.
   *
   * FIFO RULE:
   *
   * The oldest pending request must be
   * processed first.
   *
   * Example:
   *
   * 10:00 -> A
   * 10:05 -> B
   * 10:10 -> C
   *
   * B cannot be processed until A
   * is approved or rejected.
   */
  async decide(
    id: string,
    decision: "APPROVED" | "REJECTED",
    reviewer: {
      id: string;
      name: string;
    },
    reviewNote?: string
  ) {
    await connectDB();

    const request: any =
      await LeaveRequest.findById(id);

    if (!request) {
      return null;
    }

    /**
     * Only PENDING requests can be processed.
     */
    if (request.status !== "PENDING") {
      throw new Error(
        "This leave request has already been processed."
      );
    }

    /**
     * Find the oldest pending request.
     */
    const oldestPending =
      await LeaveRequest.findOne({
        status: "PENDING",
      })
        .sort({
          createdAt: 1,
          _id: 1,
        })
        .select("_id createdAt")
        .lean();

    /**
     * Enforce FIFO.
     */
    if (
      oldestPending &&
      String(oldestPending._id) !==
      String(request._id)
    ) {
      throw new Error(
        "Please process the older pending leave request first."
      );
    }

    const now = new Date();

    request.status = decision;

    request.reviewedBy = reviewer.id;
    request.reviewedByName = reviewer.name;
    request.reviewedAt = now;

    if (reviewNote?.trim()) {
      request.reviewNote = reviewNote.trim();
    }

    await request.save();

    /**
     * Rejected leave has no effect
     * on availability.
     */
    if (decision === "REJECTED") {
      return request.toObject();
    }

    /**
     * Approved leave.
     *
     * We do NOT blindly set ON_LEAVE here.
     *
     * Instead, recalculate based on
     * today's date and ALL approved leaves.
     *
     * Therefore:
     *
     * Leave: 25-27
     *
     * Approved on 19 Aug:
     * -> Available on 19 Aug
     *
     * 25 Aug:
     * -> ON_LEAVE
     *
     * 27 Aug:
     * -> ON_LEAVE
     *
     * 28 Aug:
     * -> Available
     */
    await reconcileUserLeaveAvailability(
      String(request.requestedBy)
    );

    return request.toObject();
  },

  /**
   * Withdraw a leave request.
   *
   * Allowed:
   *
   * PENDING   -> WITHDRAWN
   * APPROVED  -> WITHDRAWN
   *
   * REJECTED  -> not allowed
   * WITHDRAWN -> not allowed
   */
  async withdraw(
    id: string,
    userId: string,
    withdrawReason?: string
  ) {
    await connectDB();

    const request: any =
      await LeaveRequest.findById(id);

    if (!request) {
      return null;
    }

    /**
     * Only the requester can withdraw
     * their own leave.
     */
    if (
      String(request.requestedBy) !==
      String(userId)
    ) {
      throw new Error(
        "You can only withdraw your own leave request."
      );
    }

    /**
     * Pending and approved leaves
     * can both be withdrawn.
     */
    if (
      request.status !== "PENDING" &&
      request.status !== "APPROVED"
    ) {
      throw new Error(
        "This leave request cannot be withdrawn."
      );
    }

    request.status = "WITHDRAWN";

    request.withdrawnBy = userId;
    request.withdrawnAt = new Date();

    if (withdrawReason?.trim()) {
      request.withdrawalReason =
        withdrawReason.trim();
    }

    await request.save();

    /**
     * Recalculate availability.
     *
     * This is especially important when
     * an APPROVED leave is withdrawn.
     *
     * If another approved leave is active,
     * the user remains ON_LEAVE.
     */
    await reconcileUserLeaveAvailability(
      userId
    );

    return request.toObject();
  },

  /**
   * Reconcile one user's availability.
   *
   * Can be called when:
   *
   * - Dashboard loads
   * - Employee status is requested
   * - Leave is approved
   * - Leave is withdrawn
   * - Date changes
   */
  async reconcileUserAvailability(
    userId: string
  ) {
    await connectDB();

    await reconcileUserLeaveAvailability(
      userId
    );

    return User.findById(userId).lean();
  },

  /**
   * Reconcile all employees/admins.
   *
   * Useful for a scheduled job.
   */
  async reconcileAllUserAvailability() {
    await connectDB();

    const users = await User.find({
      role: {
        $in: [
          "EMPLOYEE",
          "ADMIN",
        ],
      },
    })
      .select("_id")
      .lean();

    for (const user of users) {
      await reconcileUserLeaveAvailability(
        String(user._id)
      );
    }

    return {
      processed: users.length,
    };
  },
};