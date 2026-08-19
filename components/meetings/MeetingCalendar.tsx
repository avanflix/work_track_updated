"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { IMeeting } from "@/types";

type ViewMode = "month" | "week";

function colorFor(meeting: IMeeting): { dot: string; bg: string } {
  if (meeting.status === "CANCELLED") return { dot: "bg-muted-foreground", bg: "bg-secondary text-muted-foreground line-through" };
  if (meeting.status === "COMPLETED") return { dot: "bg-success", bg: "bg-success/10 text-success" };
  if (meeting.status === "ONGOING") return { dot: "bg-destructive", bg: "bg-destructive/10 text-destructive" };
  return { dot: "bg-primary", bg: "bg-primary/10 text-primary" };
}

export function MeetingCalendar({
  meetings,
  loading,
  onSelect,
}: {
  meetings: IMeeting[];
  loading?: boolean;
  onSelect: (meeting: IMeeting) => void;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(new Date());

  const days = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(anchor));
      const end = endOfWeek(endOfMonth(anchor));
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(anchor);
    const end = endOfWeek(anchor);
    return eachDayOfInterval({ start, end });
  }, [anchor, view]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, IMeeting[]>();
    for (const meeting of meetings) {
      const key = new Date(meeting.scheduledAt).toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(meeting);
    }
    return map;
  }, [meetings]);

  function navigate(direction: -1 | 1) {
    setAnchor((prev) =>
      view === "month"
        ? direction === 1
          ? addMonths(prev, 1)
          : subMonths(prev, 1)
        : direction === 1
          ? addWeeks(prev, 1)
          : subWeeks(prev, 1)
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold">
            {view === "month" ? format(anchor, "MMMM yyyy") : `Week of ${format(startOfWeek(anchor), "MMM d")}`}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex gap-1 rounded-xl border border-border p-1">
          <Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>
            Month
          </Button>
          <Button size="sm" variant={view === "week" ? "default" : "ghost"} onClick={() => setView("week")}>
            Week
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-1.5",
          view === "month" ? "auto-rows-[6rem] sm:auto-rows-[7rem]" : "auto-rows-[10rem]"
        )}
      >
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayMeetings = meetingsByDay.get(key) ?? [];
          const inMonth = view === "week" || isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-1 overflow-hidden rounded-xl border border-border p-1.5 text-left",
                !inMonth && "opacity-40",
                isToday && "border-primary/60 bg-primary/5"
              )}
            >
              <span className={cn("text-xs font-medium", isToday && "text-primary")}>{format(day, "d")}</span>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayMeetings.map((meeting) => {
                  const c = colorFor(meeting);
                  return (
                    <button
                      key={meeting._id}
                      onClick={() => onSelect(meeting)}
                      title={meeting.title}
                      className={cn(
                        "flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[11px] font-medium leading-tight hover:opacity-80",
                        c.bg
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />
                      <span className="truncate">{format(new Date(meeting.scheduledAt), "HH:mm")} {meeting.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
