"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createMeetingSchema, type CreateMeetingInput } from "@/lib/validations";
import { useCreateMeeting } from "@/hooks/useMeetings";
import { useChatContacts } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MeetingForm({ onDone }: { onDone: () => void }) {
  const createMeeting = useCreateMeeting();
  const { data: contacts, isLoading: contactsLoading } = useChatContacts();

  const defaultTime = new Date(Date.now() + 30 * 60 * 1000);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMeetingInput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      participantIds: [],
      scheduledAt: toLocalInputValue(defaultTime),
      durationMinutes: 30,
      meetingType: "IN_APP",
      callType: "VIDEO",
      externalLink: "",
    },
  });

  const meetingType = watch("meetingType");
  const selected = watch("participantIds") ?? [];

  function toggleParticipant(id: string) {
    setValue("participantIds", selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id], {
      shouldValidate: true,
    });
  }

  async function onSubmit(values: CreateMeetingInput) {
    try {
      await createMeeting.mutateAsync({
        ...values,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
      });
      toast.success("Meeting scheduled");
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Could not schedule meeting");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...register("title")} placeholder="Weekly sync" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          {...register("description")}
          rows={2}
          className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          placeholder="What's this meeting about? (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date & time</Label>
          <Input type="datetime-local" {...register("scheduledAt")} />
          {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input type="number" min={5} max={480} step={5} {...register("durationMinutes")} />
          {errors.durationMinutes && <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Where</Label>
          <Select value={meetingType} onValueChange={(v) => setValue("meetingType", v as "IN_APP" | "EXTERNAL")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_APP">In-app call</SelectItem>
              <SelectItem value="EXTERNAL">External link (Zoom/Meet/etc.)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {meetingType === "IN_APP" ? (
          <div className="space-y-2">
            <Label>Call type</Label>
            <Select defaultValue="VIDEO" onValueChange={(v) => setValue("callType", v as "AUDIO" | "VIDEO")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIDEO">Video</SelectItem>
                <SelectItem value="AUDIO">Voice only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Meeting link</Label>
            <Input {...register("externalLink")} placeholder="https://meet.google.com/…" />
            {errors.externalLink && <p className="text-xs text-destructive">{errors.externalLink.message}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Invite</Label>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {contactsLoading && <p className="p-2 text-xs text-muted-foreground">Loading people…</p>}
          {contacts?.items.map((u) => (
            <label
              key={u._id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                checked={selected.includes(u._id)}
                onChange={() => toggleParticipant(u._id)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="flex-1 truncate">{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.department || "—"}</span>
            </label>
          ))}
        </div>
        {errors.participantIds && <p className="text-xs text-destructive">{errors.participantIds.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={createMeeting.isPending}>
        {createMeeting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Schedule meeting
      </Button>
    </form>
  );
}
