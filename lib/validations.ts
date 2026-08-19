import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid company email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid company email"),
});

// Frontend form
export const verifyOtpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

// Backend API
export const verifyOtpApiSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "Enter the 6-digit code"),
});

// Frontend form
export const resetPasswordFormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordFormInput = z.infer<
  typeof resetPasswordFormSchema
>;

// Backend API
export const resetPasswordSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(1, "Missing reset token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +919876543210")
    .optional()
    .or(z.literal("")),
  whatsappOptIn: z.boolean().optional(),
});

export const updateContactInfoSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +919876543210")
    .optional()
    .or(z.literal("")),
  whatsappOptIn: z.boolean().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean().optional(),
  availabilityStatus: z
    .enum(["ACTIVE", "ON_LEAVE", "INACTIVE"])
    .optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().min(5, "Description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  department: z.string().min(1),
  assignedTo: z.string().min(1, "Assign an employee"),
  startDate: z.string().min(1),
  deadline: z.string().min(1),
  estimatedHours: z.coerce.number().positive().optional(),
});

export const taskProgressUpdateSchema = z
  .object({
    status: z.enum(["PENDING", "NOTICED", "IN_PROGRESS", "COMPLETED", "ISSUE", "DELAYED", "CANCELLED"]).optional(),
    progressPercent: z.coerce.number().min(0).max(100).optional(),
    workDone: z.string().optional(),
    comment: z.string().optional(),
    // Required explanation of what exactly is wrong when status is flagged as an issue.
    issueDescription: z.string().optional(),
    timeSpentMinutes: z.coerce.number().min(0).optional(),
    // Required when status is "Working On It" (IN_PROGRESS).
    estimatedCompletionDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "ISSUE" && !data.issueDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issueDescription"],
        message: "Please explain what the issue is",
      });
    }
    if (data.status === "IN_PROGRESS" && !data.estimatedCompletionDate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedCompletionDate"],
        message: "Please provide an estimated completion date & time",
      });
    }
  });


export const updateAvailabilitySchema = z.object({
  userId: z.string().min(1, "User ID is required"),

  availabilityStatus: z.enum([
    "ACTIVE",
    "ON_LEAVE",
    "WFH",
    "HALF_DAY",
    "INACTIVE",
  ]),

  leaveFrom: z.string().optional(),

  leaveTo: z.string().optional(),

  leaveReason: z.string().optional(),
});

export type UpdateAvailabilityInput =
  z.infer<typeof updateAvailabilitySchema>;


export const delaySubmissionSchema = z.object({
  reason: z.string().min(5, "Please describe the delay reason"),
  expectedCompletionDate: z.string().min(1),
});

export const delayReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const progressUpdateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const createHolidaySchema = z.object({
  title: z.string().min(2, "Title is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["PUBLIC", "OPTIONAL"]).default("PUBLIC"),
});

export const leaveRequestSchema = z
  .object({
    leaveFrom: z.string().min(1, "Start date is required"),
    leaveTo: z.string().min(1, "End date is required"),
    reason: z.string().min(5, "Please describe the reason for leave"),
  })
  .superRefine((data, ctx) => {
    if (data.leaveFrom && data.leaveTo && data.leaveTo < data.leaveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leaveTo"],
        message: "End date cannot be before the start date",
      });
    }
  });

export const leaveReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional().or(z.literal("")),
});

export const setLeaveApproverSchema = z.object({
  adminId: z.string().min(1, "Select an admin"),
});

const EQUIPMENT_CATEGORY_VALUES = ["CAMERA", "LENS", "AUDIO", "LIGHTING", "GRIP", "DRONE", "STORAGE", "OTHER"] as const;

export const createEquipmentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  category: z.enum(EQUIPMENT_CATEGORY_VALUES).default("OTHER"),
  code: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  totalQuantity: z.number().int().min(1, "Must have at least 1").default(1),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(EQUIPMENT_CATEGORY_VALUES).optional(),
  code: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  totalQuantity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const shootLogItemInputSchema = z.object({
  equipmentId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  takeNote: z.string().optional().or(z.literal("")),
});

export const createShootLogSchema = z.object({
  shootTitle: z.string().min(2, "Shoot title is required"),
  shootDate: z.string().min(1, "Shoot date is required"),
  location: z.string().optional().or(z.literal("")),
  items: z.array(shootLogItemInputSchema).min(1, "Select at least one piece of equipment"),
});

export const shootReturnItemSchema = z.object({
  equipmentId: z.string().min(1),
  returnCondition: z.enum(["OK", "DAMAGED", "MISSING"]).default("OK"),
  returnNote: z.string().optional().or(z.literal("")),
});

export const returnShootLogSchema = z.object({
  returnNote: z.string().optional().or(z.literal("")),
  items: z.array(shootReturnItemSchema).min(1),
});

export const createClientSchema = z.object({
  name: z.string().min(2, "Client name is required"),
  description: z.string().optional().or(z.literal("")),
});

export const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const createDeliveryEventSchema = z.object({
  title: z.string().min(2, "Title is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional().or(z.literal("")),
});

export const updateDeliveryEventSchema = z.object({
  title: z.string().min(2).optional(),
  date: z.string().min(1).optional(),
  description: z.string().optional().or(z.literal("")),
});

export const transferRequestSchema = z.object({
  transferTo: z.string().min(1, "Select who to transfer this task to"),
  reason: z.string().min(5, "Please explain why this task is being transferred"),
});

export const transferReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const createWorkLogSchema = z.object({
  // Which calendar day this log belongs to. Optional - defaults to "today"
  // server-side. Sent as an ISO date string, e.g. "2026-07-14".
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  summary: z
    .string()
    .trim()
    .min(1, "Please provide a work summary")
    .max(3000),

  blockers: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal("")),
});

export const workLogCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  employeeId: z.string().optional(),
});

export const createMeetingSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    participantIds: z.array(z.string().min(1)).min(1, "Invite at least one person"),
    scheduledAt: z.string().min(1, "Pick a date & time"),
    durationMinutes: z.coerce.number().min(5).max(480),
    meetingType: z.enum(["IN_APP", "EXTERNAL"]),
    callType: z.enum(["AUDIO", "VIDEO"]).optional(),
    externalLink: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.meetingType === "EXTERNAL") {
      const parsed = z.string().url().safeParse(data.externalLink ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalLink"],
          message: "Add a valid meeting link",
        });
      }
    }
  });

export const startDirectCallSchema = z.object({
  targetUserId: z.string().min(1),
  callType: z.enum(["AUDIO", "VIDEO"]),
  conversationId: z.string().optional(),
});

export const callSignalSchema = z.object({
  to: z.string().min(1),
  type: z.enum(["OFFER", "ANSWER", "ICE_CANDIDATE"]),
  payload: z.unknown(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type StartDirectCallInput = z.infer<typeof startDirectCallSchema>;

export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type verifyOtpApiInput = z.infer<typeof verifyOtpApiSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateContactInfoInput = z.infer<typeof updateContactInfoSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type TaskProgressUpdateInput = z.infer<typeof taskProgressUpdateSchema>;
export type DelaySubmissionInput = z.infer<typeof delaySubmissionSchema>;
export type TransferRequestInput = z.infer<typeof transferRequestSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;
export type SetLeaveApproverInput = z.infer<typeof setLeaveApproverSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateShootLogInput = z.infer<typeof createShootLogSchema>;
export type ReturnShootLogInput = z.infer<typeof returnShootLogSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateDeliveryEventInput = z.infer<typeof createDeliveryEventSchema>;
export type UpdateDeliveryEventInput = z.infer<typeof updateDeliveryEventSchema>;
