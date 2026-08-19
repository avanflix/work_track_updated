import {
  Schema,
  model,
  models,
  Model,
  Document,
} from "mongoose";

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ILeaveRequestDoc extends Document {
  requestedBy: Schema.Types.ObjectId;
  requestedByName: string;
  requestedByRole:
    | "EMPLOYEE"
    | "ADMIN"
    | "SUPER_ADMIN";

  department?: string;

  /**
   * Leave dates are inclusive.
   *
   * Example:
   * leaveFrom = 25 Aug
   * leaveTo   = 27 Aug
   *
   * Leave applies on:
   * 25 Aug, 26 Aug, 27 Aug
   */
  leaveFrom: Date;
  leaveTo: Date;

  reason: string;

  /**
   * PENDING   -> waiting for approval
   * APPROVED  -> approved and active/future leave
   * REJECTED  -> rejected by approver
   * WITHDRAWN -> withdrawn by requester
   */
  status: LeaveRequestStatus;

  /**
   * Approval / rejection information.
   */
  reviewedBy?: Schema.Types.ObjectId;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNote?: string;

  /**
   * Withdrawal information.
   *
   * A requester can withdraw both:
   * - PENDING leave
   * - APPROVED leave
   */
  withdrawnBy?: Schema.Types.ObjectId;
  withdrawnAt?: Date;
  withdrawalReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema =
  new Schema<ILeaveRequestDoc>(
    {
      requestedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      requestedByName: {
        type: String,
        required: true,
        trim: true,
      },

      requestedByRole: {
        type: String,
        enum: [
          "EMPLOYEE",
          "ADMIN",
          "SUPER_ADMIN",
        ],
        required: true,
      },

      department: {
        type: String,
        trim: true,
      },

      leaveFrom: {
        type: Date,
        required: true,
        index: true,
      },

      leaveTo: {
        type: Date,
        required: true,
        index: true,
      },

      reason: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "APPROVED",
          "REJECTED",
          "WITHDRAWN",
        ],
        default: "PENDING",
        required: true,
        index: true,
      },

      /**
       * Review / approval details
       */
      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      reviewedByName: {
        type: String,
        trim: true,
      },

      reviewedAt: {
        type: Date,
      },

      reviewNote: {
        type: String,
        trim: true,
      },

      /**
       * Withdrawal details
       */
      withdrawnBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      withdrawnAt: {
        type: Date,
      },

      withdrawalReason: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * Useful indexes for:
 *
 * 1. Finding a user's leave requests
 * 2. Finding pending requests in FIFO order
 * 3. Finding approved leaves for calendar ranges
 * 4. Finding current/future approved leaves
 */
LeaveRequestSchema.index({
  requestedBy: 1,
  createdAt: -1,
});

LeaveRequestSchema.index({
  status: 1,
  createdAt: 1,
});

LeaveRequestSchema.index({
  requestedBy: 1,
  status: 1,
  leaveFrom: 1,
  leaveTo: 1,
});

LeaveRequestSchema.index({
  status: 1,
  leaveFrom: 1,
  leaveTo: 1,
});

const LeaveRequest: Model<ILeaveRequestDoc> =
  models.LeaveRequest ||
  model<ILeaveRequestDoc>(
    "LeaveRequest",
    LeaveRequestSchema
  );

export default LeaveRequest;