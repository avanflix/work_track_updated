import { Schema, model, models, Model, Document } from "mongoose";

export const EQUIPMENT_CATEGORIES = [
  "CAMERA",
  "LENS",
  "AUDIO",
  "LIGHTING",
  "GRIP",
  "DRONE",
  "STORAGE",
  "OTHER",
] as const;

export interface IEquipmentDoc extends Document {
  name: string;
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  code?: string;
  notes?: string;
  totalQuantity: number;
  isActive: boolean;
  createdBy: Schema.Types.ObjectId;
  createdByName: string;
}

const EquipmentSchema = new Schema<IEquipmentDoc>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: EQUIPMENT_CATEGORIES, default: "OTHER" },
    code: { type: String, trim: true },
    notes: { type: String, trim: true },
    totalQuantity: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

const Equipment: Model<IEquipmentDoc> = models.Equipment || model<IEquipmentDoc>("Equipment", EquipmentSchema);
export default Equipment;
