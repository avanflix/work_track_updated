import { connectDB } from "@/lib/db";
import Meeting from "@/models/Meeting";
import { notificationService } from "@/services/notificationService";
import { callService } from "@/services/callService";

export interface CreateMeetingInput {
  title: string;
  description?: string;
  organizer: string;
  participantIds: string[];
  scheduledAt: string;
  durationMinutes: number;
  meetingType: "IN_APP" | "EXTERNAL";
  callType?: "AUDIO" | "VIDEO";
  externalLink?: string;
}

export const meetingService = {
  /** Meetings where the user is either the organizer or an invitee. */
  async listForUser(userId: string, opts: { from?: string; to?: string } = {}) {
    await connectDB();

    const filter: Record<string, unknown> = {
      $or: [{ organizer: userId }, { participants: userId }],
    };

    if (opts.from || opts.to) {
      filter.scheduledAt = {
        ...(opts.from ? { $gte: new Date(opts.from) } : {}),
        ...(opts.to ? { $lte: new Date(opts.to) } : {}),
      };
    }

    return Meeting.find(filter).sort({ scheduledAt: 1 }).lean();
  },

  async findById(id: string) {
    await connectDB();
    return Meeting.findById(id).lean();
  },

  async create(input: CreateMeetingInput) {
    await connectDB();

    const participants = Array.from(new Set(input.participantIds.filter((id) => id !== input.organizer)));

    const meeting = await Meeting.create({
      title: input.title,
      description: input.description,
      organizer: input.organizer,
      participants,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      meetingType: input.meetingType,
      callType: input.callType ?? "VIDEO",
      externalLink: input.meetingType === "EXTERNAL" ? input.externalLink : undefined,
    });

    await Promise.all(
      participants.map((userId) =>
        notificationService.create({
          recipient: userId,
          title: "New meeting scheduled",
          message: `${input.title} — ${new Date(input.scheduledAt).toLocaleString()}`,
          type: "MEETING_SCHEDULED",
        })
      )
    );

    return meeting.toObject();
  },

  async cancel(id: string, requestedBy: string) {
    await connectDB();

    const meeting = await Meeting.findOne({ _id: id, organizer: requestedBy });
    if (!meeting) throw new Error("Only the organizer can cancel this meeting");

    meeting.status = "CANCELLED";
    await meeting.save();

    await Promise.all(
      meeting.participants.map((userId: any) =>
        notificationService.create({
          recipient: userId.toString(),
          title: "Meeting cancelled",
          message: `${meeting.title} has been cancelled`,
          type: "MEETING_CANCELLED",
        })
      )
    );

    return meeting.toObject();
  },

  /**
   * Called when a participant (or the organizer) hits "Join" on an IN_APP
   * meeting. Creates the call room on first join, or hands back the
   * existing one so everyone lands in the same room.
   */
  async joinCallRoom(meetingId: string, userId: string) {
    await connectDB();

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error("Meeting not found");
    if (meeting.meetingType !== "IN_APP") throw new Error("This meeting uses an external link");

    const isInvited =
      meeting.organizer.toString() === userId ||
      meeting.participants.some((p: any) => p.toString() === userId);
    if (!isInvited) throw new Error("You are not invited to this meeting");

    if (meeting.status === "CANCELLED") throw new Error("This meeting was cancelled");
    if (meeting.status === "COMPLETED") throw new Error("This meeting has already ended");

    const call = await callService.joinMeetingRoom({
      meetingId: meeting._id.toString(),
      userId,
    });

    if (meeting.status === "SCHEDULED") {
      meeting.status = "ONGOING";
    }
    meeting.call = call._id;
    await meeting.save();

    return call;
  },

  async endMeeting(meetingId: string, requestedBy: string) {
    await connectDB();

    const meeting = await Meeting.findOne({ _id: meetingId, organizer: requestedBy });
    if (!meeting) throw new Error("Only the organizer can end this meeting");

    meeting.status = "COMPLETED";
    await meeting.save();

    if (meeting.call) {
      await callService.endCall(meeting.call.toString());
    }

    return meeting.toObject();
  },
};
