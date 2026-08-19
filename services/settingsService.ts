import { connectDB } from "@/lib/db";
import AppSettings from "@/models/AppSettings";

export const settingsService = {
  async get() {
    await connectDB();
    let settings: any = await AppSettings.findOne({ key: "global" }).lean();
    if (!settings) {
      settings = await AppSettings.create({ key: "global" }).then((d) => d.toObject());
    }
    return settings;
  },

  async setLeaveApprover(adminId: string, adminName: string) {
    await connectDB();
    return AppSettings.findOneAndUpdate(
      { key: "global" },
      { leaveApprover: adminId, leaveApproverName: adminName },
      { new: true, upsert: true }
    ).lean();
  },
};
