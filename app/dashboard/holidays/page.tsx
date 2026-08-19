"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { CalendarHeart, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHolidays, useDeleteHoliday } from "@/hooks/useHolidays";
import { HolidayCalendar } from "@/components/dashboard/HolidayCalendar";
import { HolidayForm } from "@/components/forms/HolidayForm";
import { formatDate } from "@/lib/utils";
import { can } from "@/utils/permissions";
import { toast } from "sonner";

export default function HolidaysPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const manage = can(role, "MANAGE_HOLIDAYS");

  const [anchor, setAnchor] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useHolidays(anchor.getFullYear());
  const deleteHoliday = useDeleteHoliday();

  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (data?.items ?? [])
      .filter((h) => new Date(h.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [data]);

  function onDelete(id: string) {
    toast.promise(deleteHoliday.mutateAsync(id), {
      loading: "Removing...",
      success: "Holiday removed",
      error: (err) => err?.message ?? "Failed to remove holiday",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Holiday Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {manage ? "Add and manage company holidays." : "Company holidays for the year."}
          </p>
        </div>
        {manage && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add holiday
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a holiday</DialogTitle>
                <DialogDescription>This is added directly to everyone's calendar.</DialogDescription>
              </DialogHeader>
              <HolidayForm onSuccess={() => setFormOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <HolidayCalendar
              holidays={data?.items ?? []}
              loading={isLoading}
              canManage={manage}
              onDelete={onDelete}
              anchor={anchor}
              onAnchorChange={setAnchor}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarHeart className="h-4 w-4 text-primary" /> Upcoming holidays
            </CardTitle>
            <CardDescription>Next few holidays on the calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!isLoading && upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
            )}
            {upcoming.map((h) => (
              <div key={h._id} className="flex items-start justify-between gap-2 rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                  {h.description && <p className="mt-1 text-xs text-muted-foreground">{h.description}</p>}
                </div>
                <Badge variant={h.type === "PUBLIC" ? "default" : "secondary"}>{h.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
