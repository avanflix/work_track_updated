import { Schema, model, models, Model, Document } from "mongoose";

export interface IClientDoc extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: Schema.Types.ObjectId;
  createdByName: string;
}

const ClientSchema = new Schema<IClientDoc>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

const Client: Model<IClientDoc> = models.Client || model<IClientDoc>("Client", ClientSchema);
export default Client;
