"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ChevronDown, ChevronUp, PackageCheck, RotateCcw } from "lucide-react";
import { ShootReturnForm } from "@/components/forms/ShootReturnForm";
import type { IShootLog } from "@/types";

const CONDITION_TONE: Record<string, "success" | "destructive" | "warning"> = {
  OK: "success",
  DAMAGED: "destructive",
  MISSING: "warning",
};

export function ShootLogsTable({
  logs,
  loading,
  canReturn,
  showOwner = false,
}: {
  logs: IShootLog[];
  loading?: boolean;
  canReturn?: boolean;
  showOwner?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [returning, setReturning] = useState<IShootLog | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No shoot equipment logs yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const isOpen = expanded === log._id;
        return (
          <div key={log._id} className="rounded-xl border border-border">
            <button
              className="flex w-full items-center justify-between gap-3 p-3 text-left"
              onClick={() => setExpanded(isOpen ? null : log._id)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{log.shootTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(log.shootDate)}
                  {log.location ? ` · ${log.location}` : ""}
                  {showOwner ? ` · ${log.takenByName}` : ""} · {log.items.length} item(s)
                </p>
              </div>
              <Badge variant={log.status === "OUT" ? "warning" : "success"}>{log.status === "OUT" ? "Out" : "Returned"}</Badge>
              {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-border p-3">
                <div className="space-y-1.5">
                  {log.items.map((item) => (
                    <div key={item.equipment} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 px-2.5 py-1.5 text-xs">
                      <span className="font-medium">{item.equipmentName} × {item.quantity}</span>
                      {item.takeNote && <span className="text-muted-foreground">Taken: {item.takeNote}</span>}
                      {log.status === "RETURNED" && item.returnCondition && (
                        <Badge variant={CONDITION_TONE[item.returnCondition]}>{item.returnCondition}</Badge>
                      )}
                      {item.returnNote && <span className="text-muted-foreground">Return: {item.returnNote}</span>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Checked out {formatDateTime(log.checkedOutAt)}
                  {log.returnedAt ? ` · Returned ${formatDateTime(log.returnedAt)}` : ""}
                </p>
                {log.returnNote && <p className="text-xs text-muted-foreground">Note: {log.returnNote}</p>}

                {log.status === "OUT" && canReturn && (
                  <Button size="sm" onClick={() => setReturning(log)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Log return
                  </Button>
                )}
                {log.status === "RETURNED" && (
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <PackageCheck className="h-3.5 w-3.5" /> All equipment accounted for
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={!!returning} onOpenChange={(open) => !open && setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log equipment return</DialogTitle>
            <DialogDescription>{returning?.shootTitle}</DialogDescription>
          </DialogHeader>
          {returning && <ShootReturnForm log={returning} onSuccess={() => setReturning(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
