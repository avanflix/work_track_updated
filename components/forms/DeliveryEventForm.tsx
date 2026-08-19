"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreateDeliveryEvent, useUpdateDeliveryEvent, useDeleteDeliveryEvent } from "@/hooks/useDeliveryEvents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import type { IDeliveryEvent } from "@/types";

export function DeliveryEventForm({
  clientId,
  event,
  defaultDate,
  onSuccess,
}: {
  clientId: string;
  event?: IDeliveryEvent;
  defaultDate?: string;
  onSuccess?: () => void;
}) {
  const createEvent = useCreateDeliveryEvent(clientId);
  const updateEvent = useUpdateDeliveryEvent(clientId);
  const deleteEvent = useDeleteDeliveryEvent(clientId);

  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event ? new Date(event.date).toISOString().slice(0, 10) : defaultDate ?? "");
  const [description, setDescription] = useState(event?.description ?? "");

  const isEdit = !!event;
  const pending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  async function submit() {
    if (!title.trim() || !date) {
      toast.error("Please provide a title and date");
      return;
    }
    try {
      if (isEdit) {
        await updateEvent.mutateAsync({ eventId: event._id, input: { title, date, description: description || undefined } });
        toast.success("Delivery date updated");
      } else {
        await createEvent.mutateAsync({ title, date, description: description || undefined });
        toast.success("Delivery date added");
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save delivery date");
    }
  }

  async function remove() {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync(event._id);
      toast.success("Delivery date removed");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove delivery date");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Episode 3 — Final Cut" />
      </div>
      <div className="space-y-2">
        <Label>Delivery date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's being delivered, and any other details" />
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending} className="flex-1">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Add to calendar"}
        </Button>
        {isEdit && (
          <Button variant="outline" onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
