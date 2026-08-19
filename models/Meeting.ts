import { Schema, model, models, Model } from "mongoose";
import type { IMeeting } from "@/types";

const MeetingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    organizer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, default: 30, min: 5, max: 480 },

    // IN_APP -> uses the built-in WebRTC call room. EXTERNAL -> just a link
    // (Zoom/Meet/etc.) that participants open themselves.
    meetingType: { type: String, enum: ["IN_APP", "EXTERNAL"], required: true, default: "IN_APP" },
    callType: { type: String, enum: ["AUDIO", "VIDEO"], default: "VIDEO" },
    externalLink: { type: String, trim: true },

    status: {
      type: String,
      enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },

    // Set once the first participant joins an IN_APP meeting's call room.
    call: { type: Schema.Types.ObjectId, ref: "Call" },
  },
  { timestamps: true }
);

MeetingSchema.index({ organizer: 1, scheduledAt: -1 });
MeetingSchema.index({ participants: 1, scheduledAt: -1 });

const Meeting: Model<IMeeting> = models.Meeting || model<IMeeting>("Meeting", MeetingSchema);
export default Meeting;
