import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import type { UserRole } from "@/types";

export interface UserQueryOptions {
  search?: string;
  department?: string;
  role?: UserRole | UserRole[];
  isActive?: boolean;
  page?: number;
  limit?: number;
  availabilityStatus?: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
}

/**
 * Generates the next employee ID.
 * Example:
 * EMP-0001
 * EMP-0002
 * EMP-0003
 */
async function getNextEmployeeId() {
  const users = await User.find({}, { employeeId: 1 }).lean();

  let max = 0;

  for (const user of users) {
    if (!user.employeeId) continue;

    const number = parseInt(
      user.employeeId.replace("EMP-", ""),
      10
    );

    if (!isNaN(number) && number > max) {
      max = number;
    }
  }

  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Lazily keeps `availabilityStatus` in sync with the user's approved leave
 * window (leaveFrom/leaveTo), called before every read instead of running a
 * cron job:
 *  - promotes a user into "ON_LEAVE" once today reaches their approved
 *    leaveFrom date (leave should only *reflect* on the approved date, not
 *    the moment it was approved — see leaveService.decide)
 *  - demotes them back out of "ON_LEAVE" once leaveTo has passed
 */
async function reconcileLeaveWindows() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Promise.all([
    User.updateMany(
      {
        availabilityStatus: { $ne: "ON_LEAVE" },
        leaveFrom: { $lte: today },
        leaveTo: { $gte: today },
      },
      { $set: { availabilityStatus: "ON_LEAVE", availability: "ON_LEAVE" } }
    ),
    User.updateMany(
      {
        availabilityStatus: "ON_LEAVE",
        leaveTo: { $lt: today },
      },
      {
        $set: {
          availabilityStatus: "ACTIVE",
          availability: "AVAILABLE",
          leaveFrom: null,
          leaveTo: null,
          leaveReason: "",
        },
      }
    ),
  ]);
}

/**
 * Repository-style data access layer for Users.
 */
export const userService = {
  async list(options: UserQueryOptions = {}) {
    await connectDB();

    await reconcileLeaveWindows();

    const {
      search,
      department,
      role,
      isActive,
      availabilityStatus,
      page = 1,
      limit = 20,
    } = options;

    const filter: Record<string, unknown> = {};

    if (department) filter.department = department;
    if (role) filter.role = Array.isArray(role) ? { $in: role } : role;
    if (typeof isActive === "boolean") filter.isActive = isActive;
    if (availabilityStatus) {
      filter.availabilityStatus = availabilityStatus;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
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

    await reconcileLeaveWindows();

    return User.findById(id).lean();
  },

  async findByEmail(email: string) {
    await connectDB();

    await reconcileLeaveWindows();

    return User.findOne({
      email: email.toLowerCase(),
    }).lean();
  },

  async create(input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    designation?: string;
    joiningDate?: string;
    employeeId?: string;
    phone?: string;
    whatsappOptIn?: boolean;
  }) {
    await connectDB();

    const existing = await User.findOne({
      email: input.email.toLowerCase(),
    });

    if (existing) {
      throw new Error("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const employeeId =
      input.employeeId ?? (await getNextEmployeeId());

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      department: input.department,
      designation: input.designation,
      joiningDate: input.joiningDate
        ? new Date(input.joiningDate)
        : undefined,
      employeeId,
      isActive: true,
      phone: input.phone || undefined,
      whatsappOptIn: input.whatsappOptIn ?? true,

      availabilityStatus: "ACTIVE",
      leaveFrom: null,
      leaveTo: null,
      leaveReason: "",
    });

    return user.toObject();
  },

  async updateContactInfo(id: string, input: { phone?: string; whatsappOptIn?: boolean }) {
    await connectDB();

    const update: Record<string, unknown> = {};
    if (input.phone !== undefined) update.phone = input.phone || undefined;
    if (input.whatsappOptIn !== undefined) update.whatsappOptIn = input.whatsappOptIn;

    return User.findByIdAndUpdate(id, update, { new: true }).lean();
  },

  async setActive(id: string, isActive: boolean) {
    await connectDB();

    return User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).lean();
  },

  async updateAvailability(input: {
    userId: string;
    availabilityStatus:
    | "ACTIVE"
    | "ON_LEAVE"
    | "WFH"
    | "HALF_DAY"
    | "INACTIVE";
    leaveFrom?: string;
    leaveTo?: string;
    leaveReason?: string;
    updatedBy?: string;
  }) {
    await connectDB();

    const update: Record<string, unknown> = {
      availabilityStatus: input.availabilityStatus,
    };

    if (input.availabilityStatus === "ON_LEAVE") {
      update.leaveFrom = input.leaveFrom
        ? new Date(input.leaveFrom)
        : null;

      update.leaveTo = input.leaveTo
        ? new Date(input.leaveTo)
        : null;

      update.leaveReason = input.leaveReason ?? "";
    } else {
      update.leaveFrom = null;
      update.leaveTo = null;
      update.leaveReason = "";
    }

    return User.findByIdAndUpdate(
      input.userId,
      update,
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  },
  async delete(id: string) {
    await connectDB();

    return User.findByIdAndDelete(id).lean();
  },

  /**
   * All active Admin + Super Admin users — used to fan out approval-request
   * notifications (task updates, leave requests) and to populate the Super
   * Admin's "choose a leave approver" dropdown.
   */
  async listAdmins() {
    await connectDB();
    return User.find({ role: { $in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true }, "name email role department")
      .sort({ name: 1 })
      .lean();
  },
};