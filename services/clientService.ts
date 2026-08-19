import { connectDB } from "@/lib/db";
import Client from "@/models/Client";

export const clientService = {
  async list(includeInactive = false) {
    await connectDB();
    const filter = includeInactive ? {} : { isActive: true };
    return Client.find(filter).sort({ name: 1 }).lean();
  },

  async findById(id: string) {
    await connectDB();
    return Client.findById(id).lean();
  },

  async create(input: { name: string; description?: string; createdBy: string; createdByName: string }) {
    await connectDB();
    const existing = await Client.findOne({ name: input.name.trim() });
    if (existing) throw new Error("A client with this name already exists");
    const client = await Client.create(input);
    return client.toObject();
  },

  async update(id: string, input: Partial<{ name: string; description: string; isActive: boolean }>) {
    await connectDB();
    return Client.findByIdAndUpdate(id, input, { new: true }).lean();
  },

  async delete(id: string) {
    await connectDB();
    return Client.findByIdAndDelete(id).lean();
  },
};
