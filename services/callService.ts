import { connectDB } from "@/lib/db";
import Call from "@/models/Call";
import CallSignal from "@/models/CallSignal";
import User from "@/models/User";
import type { CallKind, SignalType } from "@/types";

export const callService = {
  /** Starts a 1:1 call — rings the other user. */
  async startDirectCall(input: {
    initiatorId: string;
    targetUserId: string;
    callType: CallKind;
    conversationId?: string;
  }) {
    await connectDB();

    if (input.initiatorId === input.targetUserId) {
      throw new Error("You can't call yourself");
    }

    const target = await User.findById(input.targetUserId).lean();
    if (!target || !(target as any).isActive) {
      throw new Error("That person isn't available to call right now");
    }

    // Don't let someone place a second call while one is already ringing/active
    // between the same two people.
    const existing = await Call.findOne({
      type: "DIRECT",
      status: { $in: ["RINGING", "ACTIVE"] },
      "participants.user": { $all: [input.initiatorId, input.targetUserId] },
    });
    if (existing) return existing;

    const now = new Date();
    return Call.create({
      type: "DIRECT",
      callType: input.callType,
      conversation: input.conversationId,
      initiator: input.initiatorId,
      status: "RINGING",
      startedAt: now,
      participants: [
        { user: input.initiatorId, status: "JOINED", joinedAt: now },
        { user: input.targetUserId, status: "RINGING" },
      ],
    });
  },

  /** Joins (or creates) the call room backing an IN_APP meeting. */
  async joinMeetingRoom(input: { meetingId: string; userId: string }) {
    await connectDB();

    let call = await Call.findOne({ meeting: input.meetingId, status: { $ne: "ENDED" } });
    const now = new Date();

    if (!call) {
      call = await Call.create({
        type: "MEETING",
        callType: "VIDEO",
        meeting: input.meetingId,
        initiator: input.userId,
        status: "ACTIVE",
        startedAt: now,
        participants: [{ user: input.userId, status: "JOINED", joinedAt: now }],
      });
      return call;
    }

    const existing = call.participants.find((p: any) => p.user.toString() === input.userId);
    if (existing) {
      existing.status = "JOINED";
      existing.joinedAt = now;
      existing.leftAt = undefined;
    } else {
      call.participants.push({ user: input.userId, status: "JOINED", joinedAt: now } as any);
    }
    call.status = "ACTIVE";
    await call.save();
    return call;
  },

  async getById(callId: string) {
    await connectDB();
    return Call.findById(callId).lean();
  },

  async isParticipant(callId: string, userId: string) {
    await connectDB();
    const call = await Call.findOne({ _id: callId, "participants.user": userId }, { _id: 1 }).lean();
    return !!call;
  },

  /** Calls currently ringing for this user — polled to surface an incoming-call prompt. */
  async listIncomingForUser(userId: string) {
    await connectDB();
    return Call.find({
      type: "DIRECT",
      status: "RINGING",
      participants: { $elemMatch: { user: userId, status: "RINGING" } },
    })
      .sort({ createdAt: -1 })
      .lean();
  },

  async acceptCall(callId: string, userId: string) {
    await connectDB();

    const call = await Call.findById(callId);
    if (!call) throw new Error("Call not found");

    const participant = call.participants.find((p: any) => p.user.toString() === userId);
    if (!participant) throw new Error("You weren't invited to this call");

    participant.status = "JOINED";
    participant.joinedAt = new Date();
    if (call.status === "RINGING") call.status = "ACTIVE";
    await call.save();
    return call;
  },

  async declineCall(callId: string, userId: string) {
    await connectDB();

    const call = await Call.findById(callId);
    if (!call) throw new Error("Call not found");

    const participant = call.participants.find((p: any) => p.user.toString() === userId);
    if (participant) {
      participant.status = "DECLINED";
      participant.leftAt = new Date();
    }

    // A declined 1:1 call is over for both sides.
    if (call.type === "DIRECT") {
      call.status = "ENDED";
      call.endedAt = new Date();
    }
    await call.save();
    return call;
  },

  async leaveCall(callId: string, userId: string) {
    await connectDB();

    const call = await Call.findById(callId);
    if (!call) throw new Error("Call not found");

    const participant = call.participants.find((p: any) => p.user.toString() === userId);
    if (participant) {
      participant.status = "LEFT";
      participant.leftAt = new Date();
    }

    const anyoneLeft = call.participants.some((p: any) => p.status === "JOINED" || p.status === "RINGING");
    if (!anyoneLeft && call.status !== "ENDED") {
      call.status = "ENDED";
      call.endedAt = new Date();
    }

    await call.save();
    await CallSignal.deleteMany({ call: call._id });
    return call;
  },

  async endCall(callId: string) {
    await connectDB();

    const call = await Call.findById(callId);
    if (!call) return null;

    call.status = "ENDED";
    call.endedAt = new Date();
    call.participants.forEach((p: any) => {
      if (p.status === "JOINED" || p.status === "RINGING") {
        p.status = "LEFT";
        p.leftAt = new Date();
      }
    });
    await call.save();
    await CallSignal.deleteMany({ call: call._id });
    return call;
  },

  /** Relays a WebRTC signaling message (offer/answer/ICE candidate) to a specific peer. */
  async sendSignal(input: { callId: string; from: string; to: string; type: SignalType; payload: unknown }) {
    await connectDB();
    return CallSignal.create({
      call: input.callId,
      from: input.from,
      to: input.to,
      type: input.type,
      payload: input.payload,
    });
  },

  /** Polled by the recipient: everything addressed to them since their last poll. */
  async listSignalsSince(callId: string, userId: string, since?: string) {
    await connectDB();
    const filter: Record<string, unknown> = { call: callId, to: userId };
    if (since) filter.createdAt = { $gt: new Date(since) };
    return CallSignal.find(filter).sort({ createdAt: 1 }).lean();
  },
};
