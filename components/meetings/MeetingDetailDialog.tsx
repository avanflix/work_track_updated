"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, ExternalLink, Loader2, PhoneOff, Users, Video, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCancelMeeting, useEndMeeting, useJoinMeeting } from "@/hooks/useMeetings";
import type { IMeeting } from "@/types";

const statusVariant: Record<string, string> = {
  SCHEDULED: "bg-primary/10 text-primary",
  ONGOING: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-secondary text-muted-foreground",
};

export function MeetingDetailDialog({ meeting, onClose }: { meeting: IMeeting | null; onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const join = useJoinMeeting();
  const cancelMeeting = useCancelMeeting();
  const endMeeting = useEndMeeting();

  if (!meeting) return null;

  const isOrganizer = meeting.organizer === userId;
  const canJoin = meeting.meetingType === "IN_APP" && meeting.status !== "CANCELLED" && meeting.status !== "COMPLETED";
  const canCancel = isOrganizer && meeting.status === "SCHEDULED";
  const canEnd = isOrganizer && meeting.status === "ONGOING" && meeting.meetingType === "IN_APP";

  async function handleJoin() {
    try {
      const { roomId } = await join.mutateAsync(meeting!._id);
      onClose();
      router.push(`/dashboard/calls/${roomId}`);
    } catch (err: any) {
      toast.error(err.message ?? "Could not join meeting");
    }
  }

  async function handleCancel() {
    try {
      await cancelMeeting.mutateAsync(meeting!._id);
      toast.success("Meeting cancelled");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Could not cancel meeting");
    }
  }

  async function handleEnd() {
    try {
      await endMeeting.mutateAsync(meeting!._id);
      toast.success("Meeting ended");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Could not end meeting");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Badge className={statusVariant[meeting.status]}>{meeting.status}</Badge>

          {meeting.description && <p className="text-sm text-muted-foreground">{meeting.description}</p>}

          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(meeting.scheduledAt), "EEE, MMM d · HH:mm")} · {meeting.durationMinutes} min
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            {meeting.participants.length + 1} invited
          </div>

          <div className="flex items-center gap-2 text-sm">
            {meeting.meetingType === "IN_APP" ? (
              <>
                <Video className="h-4 w-4 text-muted-foreground" /> In-app{" "}
                {meeting.callType === "AUDIO" ? "voice" : "video"} call
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 text-muted-foreground" /> External link
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {canJoin && (
              <Button onClick={handleJoin} disabled={join.isPending}>
                {join.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join meeting
              </Button>
            )}
            {meeting.meetingType === "EXTERNAL" && meeting.status !== "CANCELLED" && meeting.externalLink && (
              <Button asChild variant="outline">
                <a href={meeting.externalLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open link
                </a>
              </Button>
            )}
            {canEnd && (
              <Button variant="destructive" onClick={handleEnd} disabled={endMeeting.isPending}>
                <PhoneOff className="h-4 w-4" /> End meeting
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" onClick={handleCancel} disabled={cancelMeeting.isPending}>
                <X className="h-4 w-4" /> Cancel meeting
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
