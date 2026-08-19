import { Schema, model, models, Model, Document } from "mongoose";

export interface IHolidayDoc extends Document {
  title: string;
  date: Date;
  description?: string;
  type: "PUBLIC" | "OPTIONAL";
  createdBy: Schema.Types.ObjectId;
  createdByName: string;
}

const HolidaySchema = new Schema<IHolidayDoc>(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["PUBLIC", "OPTIONAL"], default: "PUBLIC" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

const Holiday: Model<IHolidayDoc> = models.Holiday || model<IHolidayDoc>("Holiday", HolidaySchema);
export default Holiday;
