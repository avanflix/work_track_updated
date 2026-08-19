import { connectDB } from "@/lib/db";
import { WorkLog } from "@/models/WorkLog";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";
import type { UserRole } from "@/types";
import { getWorkLogVisibleRoles } from "@/utils/permissions";

/** How far back a work log can still be created/edited. */
export const WORK_LOG_EDIT_WINDOW_DAYS = 3;

export interface WorkLogQueryOptions {
  employee?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RequestingUser {
  id: string;
  role: UserRole;
}

function startOfDay(input: Date | string) {
  const d = new Date(input);

  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    )
  );
}

function endOfDayExclusive(input: Date | string) {
  const d = startOfDay(input);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const workLogService = {
  async getVisibleEmployeeIds(
    requester: RequestingUser
  ): Promise<string[]> {
    await connectDB();

    const visibleRoles = getWorkLogVisibleRoles(requester.role);

    if (visibleRoles.length === 0) {
      return [requester.id];
    }

    const others = await User.find({
      role: { $in: visibleRoles },
    })
      .select("_id")
      .lean();

    const ids = new Set<string>([
      requester.id,
      ...others.map((u: any) => String(u._id)),
    ]);

    return Array.from(ids);
  },

  async assertCanAccessEmployee(
    requester: RequestingUser,
    targetEmployeeId: string
  ) {
    if (requester.id === targetEmployeeId) {
      return true;
    }

    await connectDB();

    const target = await User.findById(targetEmployeeId)
      .select("role")
      .lean();

    if (!target) {
      return false;
    }

    const visibleRoles = getWorkLogVisibleRoles(requester.role);

    return visibleRoles.includes(
      (target as any).role
    );
  },

  async list(
    options: WorkLogQueryOptions = {},
    requester: RequestingUser
  ) {
    await connectDB();

    const {
      employee,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options;

    const visibleIds =
      await this.getVisibleEmployeeIds(requester);

    const filter: Record<string, unknown> = {};

    if (employee) {
      if (!visibleIds.includes(employee)) {
        return {
          items: [],
          total: 0,
          page,
          limit,
        };
      }

      filter.employee = employee;
    } else {
      filter.employee = {
        $in: visibleIds,
      };
    }

    if (date) {
      filter.date = {
        $gte: startOfDay(date),
        $lt: endOfDayExclusive(date),
      };
    } else if (startDate || endDate) {
      const range: Record<string, Date> = {};

      if (startDate) {
        range.$gte = startOfDay(startDate);
      }

      if (endDate) {
        range.$lt = endOfDayExclusive(endDate);
      }

      filter.date = range;
    }

    const skip = (page - 1) * limit;

    const [items, total] =
      await Promise.all([
        WorkLog.find(filter)
          .populate(
            "employee",
            "name email department role"
          )
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        WorkLog.countDocuments(filter),
      ]);

    return {
      items,
      total,
      page,
      limit,
    };
  },

  async findById(id: string) {
    await connectDB();

    return WorkLog.findById(id)
      .populate(
        "employee",
        "name email department role"
      )
      .lean();
  },

  async findToday(employeeId: string) {
    await connectDB();

    const start = startOfDay(new Date());
    const end = endOfDayExclusive(start);

    return WorkLog.findOne({
      employee: employeeId,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .populate(
        "employee",
        "name email department role"
      )
      .lean();
  },

  async findByDate(
    employeeId: string,
    date: string
  ) {
    await connectDB();

    const start = startOfDay(date);
    const end = endOfDayExclusive(start);

    return WorkLog.findOne({
      employee: employeeId,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .populate(
        "employee",
        "name email department role"
      )
      .lean();
  },

  /**
   * Returns the complete monthly calendar.
   *
   * IMPORTANT:
   * Approved leaves are merged into the calendar.
   *
   * Example:
   *
   * Leave:
   * 25 Aug -> 27 Aug
   *
   * Calendar:
   *
   * 24 Aug -> log / no entry
   * 25 Aug -> LEAVE
   * 26 Aug -> LEAVE
   * 27 Aug -> LEAVE
   * 28 Aug -> log / no entry
   */
  async monthly(
    employeeId: string,
    year: number,
    month: number
  ) {
    await connectDB();

    /*
     * Use UTC consistently because the calendar date keys
     * are YYYY-MM-DD.
     */
    const monthStart = new Date(
      Date.UTC(year, month - 1, 1)
    );

    const monthEnd = new Date(
      Date.UTC(year, month, 1)
    );

    /*
     * Fetch work logs for the month.
     */
    const logs = await WorkLog.find({
      employee: employeeId,
      date: {
        $gte: monthStart,
        $lt: monthEnd,
      },
    })
      .populate(
        "employee",
        "name email department role"
      )
      .lean();

    /*
     * Map work logs by YYYY-MM-DD.
     */
    const byDate = new Map<string, any>();

    for (const log of logs) {
      byDate.set(
        toDateKey(new Date((log as any).date)),
        log
      );
    }

    /*
     * Fetch ONLY APPROVED leave requests that
     * overlap this month.
     *
     * Overlap condition:
     *
     * leaveFrom <= monthEnd
     * AND
     * leaveTo >= monthStart
     *
     * This allows:
     * - current leave
     * - future leave
     * - leave starting before month
     * - leave ending after month
     */
    const approvedLeaves =
      await LeaveRequest.find({
        requestedBy: employeeId,
        status: "APPROVED",

        leaveFrom: {
          $lt: monthEnd,
        },

        leaveTo: {
          $gte: monthStart,
        },
      })
        .sort({
          reviewedAt: 1,
          createdAt: 1,
        })
        .lean();

    /*
     * Map every approved leave date.
     *
     * If there are multiple approved leaves,
     * the first one in approval/creation order
     * is used for that date.
     */
    const leaveByDate = new Map<string, any>();

    for (const leave of approvedLeaves) {
      const leaveStart = startOfDay(
        new Date(leave.leaveFrom)
      );

      const leaveEnd = startOfDay(
        new Date(leave.leaveTo)
      );

      /*
       * Clamp the iteration to the current month.
       */
      const currentStart =
        leaveStart > monthStart
          ? leaveStart
          : monthStart;

      const currentEnd =
        leaveEnd < new Date(monthEnd.getTime() - 1)
          ? leaveEnd
          : new Date(
              monthEnd.getTime() - 24 * 60 * 60 * 1000
            );

      const cursor = new Date(currentStart);

      while (cursor <= currentEnd) {
        const key = toDateKey(cursor);

        if (!leaveByDate.has(key)) {
          leaveByDate.set(key, {
            _id: String(leave._id),
            leaveFrom: leave.leaveFrom,
            leaveTo: leave.leaveTo,
            reason: leave.reason,
            status: "APPROVED",
          });
        }

        cursor.setUTCDate(
          cursor.getUTCDate() + 1
        );
      }
    }

    const today = startOfDay(new Date());

    const earliestEditable =
      new Date(today);

    earliestEditable.setUTCDate(
      earliestEditable.getUTCDate() -
        WORK_LOG_EDIT_WINDOW_DAYS
    );

    const daysInMonth =
      new Date(
        Date.UTC(year, month, 0)
      ).getUTCDate();

    const days = Array.from(
      { length: daysInMonth },
      (_, i) => {
        const date = new Date(
          Date.UTC(
            year,
            month - 1,
            i + 1
          )
        );

        const key = toDateKey(date);

        const isSunday =
          date.getUTCDay() === 0;

        const isFuture =
          date.getTime() >
          today.getTime();

        const leave =
          leaveByDate.get(key) ?? null;

        /*
         * Approved leave days are NOT editable.
         */
        const isEditable =
          !isFuture &&
          !isSunday &&
          !leave &&
          date.getTime() >=
            earliestEditable.getTime();

        return {
          date: key,

          /*
           * Work log.
           *
           * Normally this will be null on leave.
           * We still return the existing log if one
           * somehow exists, but UI gives leave priority.
           */
          log: byDate.get(key) ?? null,

          /*
           * Approved leave for this date.
           */
          leave,

          isFuture,
          isEditable,
          isSunday,
        };
      }
    );

    return {
      employeeId,
      year,
      month,
      days,
    };
  },

  async upsert(input: {
    employee: string;
    date?: string;
    summary: string;
    blockers?: string;
    notes?: string;
  }) {
    await connectDB();

    const targetDate = startOfDay(
      input.date ?? new Date()
    );

    /*
     * IMPORTANT:
     * Do not allow a work log to be created
     * on an approved leave date.
     */
    const leave = await LeaveRequest.findOne({
      requestedBy: input.employee,
      status: "APPROVED",
      leaveFrom: {
        $lt: endOfDayExclusive(targetDate),
      },
      leaveTo: {
        $gte: targetDate,
      },
    }).lean();

    if (leave) {
      throw new Error(
        "Cannot create a work log on an approved leave date."
      );
    }

    const workLog =
      await WorkLog.findOne({
        employee: input.employee,
        date: targetDate,
      });

    if (workLog) {
      workLog.summary =
        input.summary;

      workLog.blockers =
        input.blockers ?? "";

      workLog.notes =
        input.notes ?? "";

      workLog.submittedAt =
        new Date();

      await workLog.save();

      return WorkLog.findById(
        workLog._id
      )
        .populate(
          "employee",
          "name email department role"
        )
        .lean();
    }

    const created =
      await WorkLog.create({
        employee: input.employee,
        date: targetDate,
        summary: input.summary,
        blockers:
          input.blockers ?? "",
        notes:
          input.notes ?? "",
        submittedAt: new Date(),
      });

    return WorkLog.findById(
      created._id
    )
      .populate(
        "employee",
        "name email department role"
      )
      .lean();
  },

  async update(
    id: string,
    input: {
      summary: string;
      blockers?: string;
      notes?: string;
    }
  ) {
    await connectDB();

    const existing =
      await WorkLog.findById(id);

    if (!existing) {
      throw new Error(
        "Work log not found"
      );
    }

    /*
     * Do not allow editing a work log if
     * that date is now an approved leave.
     */
    const leave =
      await LeaveRequest.findOne({
        requestedBy: existing.employee,
        status: "APPROVED",
        leaveFrom: {
          $lt: endOfDayExclusive(
            existing.date
          ),
        },
        leaveTo: {
          $gte: startOfDay(
            existing.date
          ),
        },
      }).lean();

    if (leave) {
      throw new Error(
        "Cannot update a work log on an approved leave date."
      );
    }

    const updated =
      await WorkLog.findByIdAndUpdate(
        id,
        {
          $set: {
            summary: input.summary,
            blockers:
              input.blockers ?? "",
            notes:
              input.notes ?? "",
            submittedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        "employee",
        "name email department role"
      );

    if (!updated) {
      throw new Error(
        "Work log not found"
      );
    }

    return updated.toObject();
  },

  async delete(id: string) {
    await connectDB();

    return WorkLog.findByIdAndDelete(
      id
    ).lean();
  },

  async employeeHistory(
    employeeId: string
  ) {
    await connectDB();

    return WorkLog.find({
      employee: employeeId,
    })
      .populate(
        "employee",
        "name email department role"
      )
      .sort({ date: -1 })
      .lean();
  },

  async todaysSubmissions(
    requester: RequestingUser
  ) {
    await connectDB();

    const visibleIds =
      await this.getVisibleEmployeeIds(
        requester
      );

    const start =
      startOfDay(new Date());

    const end =
      endOfDayExclusive(start);

    return WorkLog.find({
      employee: {
        $in: visibleIds,
      },
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .populate(
        "employee",
        "name email department role"
      )
      .sort({ createdAt: -1 })
      .lean();
  },
};