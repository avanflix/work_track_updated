export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskStatus =
  | "PENDING"
  | "NOTICED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ISSUE"
  | "DELAYED"
  | "CANCELLED";

export interface IUser {
  _id: string;
  name: string;
  employeeId?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  designation?: string;
  joiningDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  availabilityStatus: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  availability:
  | "AVAILABLE"
  | "ON_LEAVE"
  | "WFH"
  | "HALF_DAY"
  | "INACTIVE";
  leaveFrom?: Date;
  leaveTo?: Date;
  leaveReason?: string;
  phone?: string;
  whatsappOptIn: boolean;
}

export interface SafeUser {
  id: string;
  name: string;
  employeeId?: string;
  email: string;
  role: UserRole;
  department?: string;
  designation?: string;
  joiningDate?: string;
  isActive: boolean;
  availabilityStatus: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
}

export interface ITaskTimelineEntry {
  timestamp: string;
  author: string;
  authorName: string;
  action: string;
  note?: string;
}

export interface IDelaySubmission {
  reason: string;
  expectedCompletionDate: string;
  submittedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
}

/**
 * A task update (progress/status change) submitted by the assignee that is
 * awaiting sign-off from an admin before it's applied to the task. Only one
 * can be pending on a task at a time — submitting a new one while one is
 * already pending is rejected by the service layer.
 */
export interface IPendingTaskUpdate {
  status?: TaskStatus;
  progressPercent?: number;
  workDone?: string;
  comment?: string;
  issueDescription?: string;
  timeSpentMinutes?: number;
  estimatedCompletionDate?: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export interface ITask {
  _id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  department: string;
  assignedTo: string;
  createdBy: string;
  startDate: string;
  deadline: string;
  estimatedHours?: number;
  status: TaskStatus;
  completionPercent: number;
  remarks?: string;
  currentIssue?: string;
  timeSpentMinutes: number;
  delaySubmission?: IDelaySubmission;
  pendingUpdate?: IPendingTaskUpdate;
  timeline: ITaskTimelineEntry[];
  estimatedCompletionDate?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITransferRequest {
  _id: string;
  task: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: UserRole;
  transferTo: string;
  transferToName: string;
  reason: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
  previousAssignee: string;
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type:
  | "TASK_ASSIGNED"
  | "DEADLINE_APPROACHING"
  | "TASK_COMPLETED"
  | "TASK_ISSUE"
  | "DELAY_SUBMITTED"
  | "DELAY_REVIEWED"
  | "MEETING_SCHEDULED"
  | "MEETING_CANCELLED"
  | "TASK_UPDATE_REQUESTED"
  | "TASK_UPDATE_REVIEWED"
  | "LEAVE_REQUESTED"
  | "LEAVE_REVIEWED"
  | "LEAVE_WITHDRAWN"
  | "HOLIDAY_ADDED"
  | "GENERAL";
  relatedTask?: string;
  isRead: boolean;
  createdAt: string;
}

export interface IDepartment {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export type ConversationType = "DIRECT" | "GROUP";

export interface IConversation {
  _id: string;
  type: ConversationType;
  isGlobal: boolean;
  name?: string;
  participants: string[];
  createdBy?: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  lastMessageBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  _id: string;
  conversation: string;
  sender: string;
  content: string;
  readBy: string[];
  createdAt: string;
}

export interface ChatContact {
  _id: string;
  name: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
}

export interface ConversationListItem extends IConversation {
  displayName: string;
  otherParticipant?: ChatContact;
  unreadCount: number;
}

export type MeetingType = "IN_APP" | "EXTERNAL";
export type MeetingStatus = "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type CallKind = "AUDIO" | "VIDEO";

export interface IMeeting {
  _id: string;
  title: string;
  description?: string;
  organizer: string;
  participants: string[];
  scheduledAt: string;
  durationMinutes: number;
  meetingType: MeetingType;
  callType: CallKind;
  externalLink?: string;
  status: MeetingStatus;
  call?: string;
  createdAt: string;
  updatedAt: string;
}

export type CallType = "DIRECT" | "MEETING";
export type CallStatus = "RINGING" | "ACTIVE" | "ENDED";
export type CallParticipantStatus = "RINGING" | "JOINED" | "DECLINED" | "LEFT";

export interface ICallParticipant {
  user: string;
  status: CallParticipantStatus;
  joinedAt?: string;
  leftAt?: string;
}

export interface ICall {
  _id: string;
  type: CallType;
  callType: CallKind;
  conversation?: string;
  meeting?: string;
  initiator: string;
  participants: ICallParticipant[];
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SignalType = "OFFER" | "ANSWER" | "ICE_CANDIDATE";

export interface ICallSignal {
  _id: string;
  call: string;
  from: string;
  to: string;
  type: SignalType;
  payload: unknown;
  createdAt: string;
}

/** Shape returned by GET /api/calls/[roomId] — participants are populated. */
export interface ICallStateParticipant {
  user: { _id: string; name: string; role: UserRole; department?: string };
  status: CallParticipantStatus;
  joinedAt?: string;
  leftAt?: string;
}

export interface ICallState extends Omit<ICall, "participants"> {
  participants: ICallStateParticipant[];
}

export interface IHoliday {
  _id: string;
  title: string;
  date: string;
  description?: string;
  type: "PUBLIC" | "OPTIONAL";
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ILeaveRequest {
  _id: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: UserRole;
  department?: string;
  leaveFrom: string;
  leaveTo: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  withdrawnBy?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Singleton app-wide configuration document. Currently just holds the
 * Super Admin's chosen leave approver (an Admin who, alongside any Super
 * Admin, can approve/reject leave requests).
 */
export interface IAppSettings {
  _id: string;
  leaveApprover?: string;
  leaveApproverName?: string;
  updatedAt: string;
}

export type EquipmentCategory = "CAMERA" | "LENS" | "AUDIO" | "LIGHTING" | "GRIP" | "DRONE" | "STORAGE" | "OTHER";

export interface IEquipment {
  _id: string;
  name: string;
  category: EquipmentCategory;
  code?: string;
  notes?: string;
  totalQuantity: number;
  /** Computed server-side (totalQuantity minus what's currently checked out); not persisted. */
  availableQuantity?: number;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface IShootLogItem {
  equipment: string;
  equipmentName: string;
  category: EquipmentCategory;
  quantity: number;
  takeNote?: string;
  returnCondition?: "OK" | "DAMAGED" | "MISSING";
  returnNote?: string;
}

/**
 * A material log entry: equipment checked out by someone for a shoot, and
 * (once they're back) the corresponding return details — the digital
 * version of the DOP's equipment sign-out sheet.
 */
export interface IShootLog {
  _id: string;
  shootTitle: string;
  shootDate: string;
  location?: string;
  takenBy: string;
  takenByName: string;
  takenByRole: UserRole;
  items: IShootLogItem[];
  status: "OUT" | "RETURNED";
  checkedOutAt: string;
  returnedAt?: string;
  returnNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IClient {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One entry on a client's content delivery calendar — a date something is
 * due out to that client, plus what it is.
 */
export interface IDeliveryEvent {
  _id: string;
  client: string;
  title: string;
  date: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  delayedTasks: number;
  issueTasks: number;
  upcomingDeadlines: number;
}
