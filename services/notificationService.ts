import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import type { INotification } from "@/types";

export const notificationService = {
  async create(input: {
    recipient: string;
    title: string;
    message: string;
    type: INotification["type"];
    relatedTask?: string;
  }) {
    await connectDB();
    const notification = await Notification.create(input);

    // Best-effort WhatsApp delivery, on top of the in-app notification.
    // Never lets a WhatsApp failure break the caller's flow (task
    // assignment, meeting invites, etc.) — the in-app notification above
    // is already saved and is the source of truth either way.
    try {
      const recipient = await User.findById(input.recipient, "phone whatsappOptIn isActive").lean();
      if (recipient && (recipient as any).isActive && (recipient as any).whatsappOptIn !== false) {
        await sendWhatsAppNotification((recipient as any).phone, input.title, input.message);
      }
    } catch (err) {
      console.error("[notifications] whatsapp dispatch failed", err);
    }

    return notification;
  },

  async listForUser(userId: string, unreadOnly = false) {
    await connectDB();
    const filter: Record<string, unknown> = { recipient: userId };
    if (unreadOnly) filter.isRead = false;
    return Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  },

  async markRead(id: string, userId: string) {
    await connectDB();
    return Notification.findOneAndUpdate({ _id: id, recipient: userId }, { isRead: true }, { new: true }).lean();
  },

  async markAllRead(userId: string) {
    await connectDB();
    return Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
  },
};
