import { connectDB } from "@/lib/db";
import Holiday from "@/models/Holiday";

export const holidayService = {
  /**
   * All holidays, optionally scoped to a year (and month) for calendar
   * rendering. With no filters, returns every holiday sorted chronologically
   * — this powers the sidebar's Holiday Calendar page.
   */
  async list(options: { year?: number; month?: number } = {}) {
    await connectDB();
    const filter: Record<string, unknown> = {};

    if (options.year) {
      const month = options.month ? options.month - 1 : 0;
      const start = options.month
        ? new Date(Date.UTC(options.year, month, 1))
        : new Date(Date.UTC(options.year, 0, 1));
      const end = options.month
        ? new Date(Date.UTC(options.year, month + 1, 1))
        : new Date(Date.UTC(options.year + 1, 0, 1));
      filter.date = { $gte: start, $lt: end };
    }

    return Holiday.find(filter).sort({ date: 1 }).lean();
  },

  async create(input: {
    title: string;
    date: string;
    description?: string;
    type?: "PUBLIC" | "OPTIONAL";
    createdBy: string;
    createdByName: string;
  }) {
    await connectDB();
    const [y, m, d] = input.date.split("-").map(Number);
    const holiday = await Holiday.create({
      title: input.title,
      date: new Date(Date.UTC(y, m - 1, d)),
      description: input.description,
      type: input.type ?? "PUBLIC",
      createdBy: input.createdBy,
      createdByName: input.createdByName,
    });
    return holiday.toObject();
  },

  async delete(id: string) {
    await connectDB();
    return Holiday.findByIdAndDelete(id).lean();
  },
};
