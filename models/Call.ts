import { Schema, model, models, Model } from "mongoose";

const CallParticipantSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["RINGING", "JOINED", "DECLINED", "LEFT"],
      default: "RINGING",
    },
    joinedAt: { type: Date },
    leftAt: { type: Date },
  },
  { _id: false }
);

const CallSchema = new Schema(
  {
    // DIRECT = 1:1 call started from a chat, rings the other person.
    // MEETING = the room backing a scheduled Meeting; participants join
    // when ready instead of being "rung".
    type: { type: String, enum: ["DIRECT", "MEETING"], required: true },
    callType: { type: String, enum: ["AUDIO", "VIDEO"], default: "VIDEO" },

    conversation: { type: Schema.Types.ObjectId, ref: "Conversation" },
    meeting: { type: Schema.Types.ObjectId, ref: "Meeting", index: true },

    initiator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants: [CallParticipantSchema],

    status: { type: String, enum: ["RINGING", "ACTIVE", "ENDED"], default: "RINGING", index: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

CallSchema.index({ "participants.user": 1, status: 1 });

const Call: Model<any> = models.Call || model<any>("Call", CallSchema);
export default Call;
