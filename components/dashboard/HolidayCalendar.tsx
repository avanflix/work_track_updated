"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, PartyPopper, Trash2 } from "lucide-react";
import type { IHoliday } from "@/types";

export function HolidayCalendar({
  holidays,
  loading,
  canManage,
  onDelete,
  anchor,
  onAnchorChange,
}: {
  holidays: IHoliday[];
  loading?: boolean;
  canManage?: boolean;
  onDelete?: (id: string) => void;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor));
    const end = endOfWeek(endOfMonth(anchor));
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const holidaysByDay = useMemo(() => {
    const map = new Map<string, IHoliday[]>();
    for (const holiday of holidays) {
      const key = new Date(holiday.date).toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(holiday);
    }
    return map;
  }, [holidays]);

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
          <Button variant="outline" size="icon" onClick={() => onAnchorChange(subMonths(anchor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold">{format(anchor, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => onAnchorChange(addMonths(anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAnchorChange(new Date())}>
            Today
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

      <div className="grid grid-cols-7 gap-1.5 auto-rows-[6rem] sm:auto-rows-[7rem]">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayHolidays = holidaysByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-1 overflow-hidden rounded-xl border border-border p-1.5 text-left",
                !inMonth && "opacity-40",
                isToday && "border-primary/60 bg-primary/5",
                dayHolidays.length > 0 && "border-success/40 bg-success/5"
              )}
            >
              <span className={cn("text-xs font-medium", isToday && "text-primary")}>{format(day, "d")}</span>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayHolidays.map((holiday) => (
                  <div
                    key={holiday._id}
                    title={holiday.description || holiday.title}
                    className="group flex items-center gap-1 rounded-lg bg-success/10 px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-success"
                  >
                    <PartyPopper className="h-2.5 w-2.5 shrink-0" />
                    <span className="flex-1 truncate">{holiday.title}</span>
                    {canManage && onDelete && (
                      <button
                        onClick={() => onDelete(holiday._id)}
                        className="hidden shrink-0 hover:text-destructive group-hover:block"
                        title="Remove holiday"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
