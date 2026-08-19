import { Schema, model, models, Model, Document } from "mongoose";

export interface IDeliveryEventDoc extends Document {
  client: Schema.Types.ObjectId;
  title: string;
  date: Date;
  description?: string;
  createdBy: Schema.Types.ObjectId;
  createdByName: string;
}

const DeliveryEventSchema = new Schema<IDeliveryEventDoc>(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

const DeliveryEvent: Model<IDeliveryEventDoc> =
  models.DeliveryEvent || model<IDeliveryEventDoc>("DeliveryEvent", DeliveryEventSchema);
export default DeliveryEvent;
