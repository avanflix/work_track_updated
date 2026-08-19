import { Schema, model, models, Model, Document } from "mongoose";
import { EQUIPMENT_CATEGORIES } from "./Equipment";

export interface IShootLogItemDoc {
  equipment: Schema.Types.ObjectId;
  equipmentName: string;
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  quantity: number;
  takeNote?: string;
  returnCondition?: "OK" | "DAMAGED" | "MISSING";
  returnNote?: string;
}

export interface IShootLogDoc extends Document {
  shootTitle: string;
  shootDate: Date;
  location?: string;
  takenBy: Schema.Types.ObjectId;
  takenByName: string;
  takenByRole: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";
  items: IShootLogItemDoc[];
  status: "OUT" | "RETURNED";
  checkedOutAt: Date;
  returnedAt?: Date;
  returnNote?: string;
}

const ShootLogItemSchema = new Schema<IShootLogItemDoc>(
  {
    equipment: { type: Schema.Types.ObjectId, ref: "Equipment", required: true },
    equipmentName: { type: String, required: true },
    category: { type: String, enum: EQUIPMENT_CATEGORIES, default: "OTHER" },
    quantity: { type: Number, default: 1, min: 1 },
    takeNote: { type: String, trim: true },
    returnCondition: { type: String, enum: ["OK", "DAMAGED", "MISSING"] },
    returnNote: { type: String, trim: true },
  },
  { _id: false }
);

const ShootLogSchema = new Schema<IShootLogDoc>(
  {
    shootTitle: { type: String, required: true, trim: true },
    shootDate: { type: Date, required: true },
    location: { type: String, trim: true },
    takenBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    takenByName: { type: String, required: true },
    takenByRole: { type: String, enum: ["EMPLOYEE", "ADMIN", "SUPER_ADMIN"], required: true },
    items: { type: [ShootLogItemSchema], validate: (v: unknown[]) => v.length > 0 },
    status: { type: String, enum: ["OUT", "RETURNED"], default: "OUT", index: true },
    checkedOutAt: { type: Date, default: Date.now },
    returnedAt: { type: Date },
    returnNote: { type: String, trim: true },
  },
  { timestamps: true }
);

const ShootLog: Model<IShootLogDoc> = models.ShootLog || model<IShootLogDoc>("ShootLog", ShootLogSchema);
export default ShootLog;
