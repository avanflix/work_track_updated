import { connectDB } from "@/lib/db";
import DeliveryEvent from "@/models/DeliveryEvent";

export const deliveryEventService = {
  async list(clientId: string, options: { year?: number; month?: number } = {}) {
    await connectDB();
    const filter: Record<string, unknown> = { client: clientId };

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

    return DeliveryEvent.find(filter).sort({ date: 1 }).lean();
  },

  async findById(id: string) {
    await connectDB();
    return DeliveryEvent.findById(id).lean();
  },

  async create(input: {
    client: string;
    title: string;
    date: string;
    description?: string;
    createdBy: string;
    createdByName: string;
  }) {
    await connectDB();
    const [y, m, d] = input.date.split("-").map(Number);
    const event = await DeliveryEvent.create({
      client: input.client,
      title: input.title,
      date: new Date(Date.UTC(y, m - 1, d)),
      description: input.description,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
    });
    return event.toObject();
  },

  async update(id: string, input: Partial<{ title: string; date: string; description: string }>) {
    await connectDB();
    const update: Record<string, unknown> = { ...input };
    if (input.date) {
      const [y, m, d] = input.date.split("-").map(Number);
      update.date = new Date(Date.UTC(y, m - 1, d));
    }
    return DeliveryEvent.findByIdAndUpdate(id, update, { new: true }).lean();
  },

  async delete(id: string) {
    await connectDB();
    return DeliveryEvent.findByIdAndDelete(id).lean();
  },
};
