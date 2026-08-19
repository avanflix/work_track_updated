"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { CalendarClock, ExternalLink, Plus, Users, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCalendarMeetings, useMeetings } from "@/hooks/useMeetings";
import { MeetingForm } from "@/components/meetings/MeetingForm";
import { MeetingCalendar } from "@/components/meetings/MeetingCalendar";
import { MeetingDetailDialog } from "@/components/meetings/MeetingDetailDialog";
import type { IMeeting } from "@/types";

const statusVariant: Record<string, string> = {
  SCHEDULED: "bg-primary/10 text-primary",
  ONGOING: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-secondary text-muted-foreground",
};

export default function MeetingsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [view, setView] = useState<"upcoming" | "calendar">("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<IMeeting | null>(null);

  const { data: listData, isLoading: listLoading } = useMeetings();
  const { data: calendarData, isLoading: calendarLoading } = useCalendarMeetings();

  const upcoming = useMemo(
    () =>
      (listData?.items ?? [])
        .filter((m) => m.status !== "CANCELLED")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [listData]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Meetings</h1>
          <p className="text-sm text-muted-foreground">Schedule meetings and join in-app calls, right on time.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-secondary/40 p-1 text-sm">
            <button
              onClick={() => setView("upcoming")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-colors",
                view === "upcoming" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-colors",
                view === "calendar" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Calendar
            </button>
          </div>

          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Schedule meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule a meeting</DialogTitle>
              </DialogHeader>
              <MeetingForm onDone={() => setFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === "upcoming" ? (
        <Card className="p-4">
          {listLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}

          {!listLoading && !upcoming.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No meetings scheduled yet. Click "Schedule meeting" to set one up.
            </p>
          )}

          <div className="divide-y divide-border">
            {upcoming.map((meeting) => (
              <button
                key={meeting._id}
                onClick={() => setSelected(meeting)}
                className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-xs font-semibold">
                  <span>{format(new Date(meeting.scheduledAt), "MMM")}</span>
                  <span className="text-base">{format(new Date(meeting.scheduledAt), "d")}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{meeting.title}</p>
                    <Badge className={statusVariant[meeting.status]}>{meeting.status}</Badge>
                    {meeting.organizer === userId && <Badge variant="outline">Organizer</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {format(new Date(meeting.scheduledAt), "HH:mm")} · {meeting.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {meeting.participants.length + 1}
                    </span>
                    <span className="flex items-center gap-1">
                      {meeting.meetingType === "IN_APP" ? (
                        <Video className="h-3.5 w-3.5" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      {meeting.meetingType === "IN_APP" ? "In-app" : "External"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <MeetingCalendar meetings={calendarData?.items ?? []} loading={calendarLoading} onSelect={setSelected} />
        </Card>
      )}

      <MeetingDetailDialog meeting={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
