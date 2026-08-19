import { Schema, model, models, Model } from "mongoose";
import type { IUser } from "@/types";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "EMPLOYEE",
      ],
      required: true,
      default: "EMPLOYEE",
    },

    department: {
      type: String,
      trim: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    joiningDate: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Current availability state.
     *
     * ACTIVE     -> currently working/available
     * ON_LEAVE   -> currently inside an approved leave
     * INACTIVE   -> user is inactive
     */
    availabilityStatus: {
      type: String,
      enum: [
        "ACTIVE",
        "ON_LEAVE",
        "INACTIVE",
      ],
      default: "ACTIVE",
      index: true,
    },

    /**
     * More detailed availability.
     */
    availability: {
      type: String,
      enum: [
        "AVAILABLE",
        "ON_LEAVE",
        "WFH",
        "HALF_DAY",
        "INACTIVE",
      ],
      default: "AVAILABLE",
      index: true,
    },

    /**
     * These fields represent the CURRENT active
     * approved leave reflected on the user.
     *
     * They should NOT be used as the source of
     * truth for future leave requests.
     *
     * LeaveRequest is the source of truth.
     */
    leaveFrom: {
      type: Date,
      default: null,
    },

    leaveTo: {
      type: Date,
      default: null,
    },

    leaveReason: {
      type: String,
      default: "",
    },

    // WhatsApp delivery (Meta Cloud API)
    phone: {
      type: String,
      trim: true,
    },

    whatsappOptIn: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({
  name: "text",
  email: "text",
  department: "text",
});

const User: Model<IUser> =
  models.User ||
  model<IUser>("User", UserSchema);

export default User;