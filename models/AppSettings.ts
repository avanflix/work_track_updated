import { Schema, model, models, Model, Document } from "mongoose";

/**
 * Singleton document (there is only ever one row, keyed by `key: "global"`)
 * holding app-wide configuration. Currently just the Super Admin's chosen
 * leave approver — the one Admin who, alongside any Super Admin, can
 * approve/reject leave requests.
 */
export interface IAppSettingsDoc extends Document {
  key: string;
  leaveApprover?: Schema.Types.ObjectId;
  leaveApproverName?: string;
}

const AppSettingsSchema = new Schema<IAppSettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    leaveApprover: { type: Schema.Types.ObjectId, ref: "User" },
    leaveApproverName: { type: String },
  },
  { timestamps: true }
);

const AppSettings: Model<IAppSettingsDoc> =
  models.AppSettings || model<IAppSettingsDoc>("AppSettings", AppSettingsSchema);
export default AppSettings;
