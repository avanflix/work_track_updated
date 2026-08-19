import { connectDB } from "@/lib/db";
import ShootLog from "@/models/ShootLog";
import { equipmentService, getOutstandingQuantities } from "./equipmentService";
import { getWorkLogVisibleRoles } from "@/utils/permissions";
import type { UserRole } from "@/types";

export const shootLogService = {
  /**
   * Checkout: creates the log with the selected equipment. Denormalizes
   * equipment name/category at the time of taking so the log stays
   * accurate even if the catalog entry is edited or retired later.
   */
  async create(input: {
    shootTitle: string;
    shootDate: string;
    location?: string;
    items: { equipmentId: string; quantity: number; takeNote?: string }[];
    takenBy: { id: string; name: string; role: UserRole };
  }) {
    await connectDB();

    const equipmentIds = input.items.map((i) => i.equipmentId);
    const catalogItems = await equipmentService.findByIds(equipmentIds);
    const catalogMap = new Map(catalogItems.map((c: any) => [c._id.toString(), c]));
    const outstanding = await getOutstandingQuantities();

    const items = input.items.map((i) => {
      const catalogItem: any = catalogMap.get(i.equipmentId);
      if (!catalogItem) throw new Error("One of the selected equipment items no longer exists");

      const available = Math.max(0, catalogItem.totalQuantity - (outstanding.get(i.equipmentId) ?? 0));
      if (i.quantity > available) {
        throw new Error(`Only ${available} of "${catalogItem.name}" available right now`);
      }

      return {
        equipment: i.equipmentId,
        equipmentName: catalogItem.name,
        category: catalogItem.category,
        quantity: i.quantity,
        takeNote: i.takeNote,
      };
    });

    const log = await ShootLog.create({
      shootTitle: input.shootTitle,
      shootDate: new Date(input.shootDate),
      location: input.location,
      takenBy: input.takenBy.id,
      takenByName: input.takenBy.name,
      takenByRole: input.takenBy.role,
      items,
      status: "OUT",
      checkedOutAt: new Date(),
    });

    return log.toObject();
  },

  async findById(id: string) {
    await connectDB();
    return ShootLog.findById(id).lean();
  },

  async listMine(userId: string) {
    await connectDB();
    return ShootLog.find({ takenBy: userId }).sort({ createdAt: -1 }).lean();
  },

  /**
   * Team view: same role-hierarchy scoping as work logs — an Admin sees
   * Employees' logs, the Super Admin sees everyone's, an Employee only
   * ever sees their own (so this is only meaningful for Admin/Super Admin).
   */
  async listTeam(viewerRole: UserRole) {
    await connectDB();
    const visibleRoles = getWorkLogVisibleRoles(viewerRole);
    if (visibleRoles.length === 0) return [];
    return ShootLog.find({ takenByRole: { $in: visibleRoles } }).sort({ createdAt: -1 }).lean();
  },

  async markReturned(
    id: string,
    input: { returnNote?: string; items: { equipmentId: string; returnCondition: "OK" | "DAMAGED" | "MISSING"; returnNote?: string }[] }
  ) {
    await connectDB();
    const log: any = await ShootLog.findById(id);
    if (!log) return null;
    if (log.status === "RETURNED") return log.toObject();

    const returnMap = new Map(input.items.map((i) => [i.equipmentId, i]));
    log.items = log.items.map((item: any) => {
      const match = returnMap.get(item.equipment.toString());
      if (match) {
        item.returnCondition = match.returnCondition;
        item.returnNote = match.returnNote;
      }
      return item;
    });
    log.status = "RETURNED";
    log.returnedAt = new Date();
    if (input.returnNote) log.returnNote = input.returnNote;

    await log.save();
    return log.toObject();
  },
};
