import { Schema, model, models, Model } from "mongoose";
import type { ICallSignal } from "@/types";

const CallSignalSchema = new Schema(
  {
    call: { type: Schema.Types.ObjectId, ref: "Call", required: true, index: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["OFFER", "ANSWER", "ICE_CANDIDATE"], required: true },
    // SDP string for OFFER/ANSWER, RTCIceCandidateInit for ICE_CANDIDATE.
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CallSignalSchema.index({ call: 1, to: 1, createdAt: 1 });
// Signals are short-lived polling messages, not a persistent chat log —
// let Mongo garbage-collect them an hour after the call ends/errors out.
CallSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

const CallSignal: Model<ICallSignal> =
  models.CallSignal || model<ICallSignal>("CallSignal", CallSignalSchema);
export default CallSignal;
