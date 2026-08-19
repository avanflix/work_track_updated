"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEquipmentCatalog } from "@/hooks/useEquipment";
import { useCreateShootLog } from "@/hooks/useShoots";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2, Minus, Plus } from "lucide-react";
import type { IEquipment } from "@/types";

interface Selection {
  quantity: number;
  takeNote: string;
}

export function ShootLogForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data, isLoading } = useEquipmentCatalog(false);
  const createLog = useCreateShootLog();

  const [shootTitle, setShootTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<Record<string, Selection>>({});

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<string, IEquipment[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [data]);

  function toggle(item: IEquipment) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item._id]) {
        delete next[item._id];
      } else {
        next[item._id] = { quantity: 1, takeNote: "" };
      }
      return next;
    });
  }

  function setQuantity(id: string, quantity: number, max?: number) {
    const clamped = Math.max(1, max ? Math.min(quantity, max) : quantity);
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], quantity: clamped } }));
  }

  function setNote(id: string, takeNote: string) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], takeNote } }));
  }

  async function submit() {
    if (!shootTitle.trim() || !shootDate) {
      toast.error("Please provide a shoot title and date");
      return;
    }
    const items = Object.entries(selected).map(([equipmentId, sel]) => ({
      equipmentId,
      quantity: sel.quantity,
      takeNote: sel.takeNote || undefined,
    }));
    if (items.length === 0) {
      toast.error("Select at least one piece of equipment");
      return;
    }
    try {
      await createLog.mutateAsync({ shootTitle, shootDate, location: location || undefined, items });
      toast.success("Equipment checked out");
      setShootTitle("");
      setShootDate("");
      setLocation("");
      setSelected({});
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to log equipment");
    }
  }

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Shoot title</Label>
          <Input value={shootTitle} onChange={(e) => setShootTitle(e.target.value)} placeholder="e.g. Product shoot — Acme" />
        </div>
        <div className="space-y-2">
          <Label>Shoot date</Label>
          <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Location (optional)</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Studio 2" />
      </div>

      <div className="space-y-3">
        <Label>Equipment taken</Label>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        )}
        {!isLoading && grouped.length === 0 && (
          <p className="text-sm text-muted-foreground">No equipment in the catalog yet.</p>
        )}
        <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-border p-3">
          {grouped.map(([category, items]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category.charAt(0) + category.slice(1).toLowerCase()}</p>
              <div className="space-y-2">
                {items.map((item) => {
                  const isSelected = !!selected[item._id];
                  const available = item.availableQuantity ?? item.totalQuantity;
                  const outOfStock = available <= 0;
                  return (
                    <div
                      key={item._id}
                      className={cn(
                        "rounded-xl border border-border p-2.5 transition-colors",
                        isSelected && "border-primary/50 bg-primary/5",
                        outOfStock && !isSelected && "opacity-50"
                      )}
                    >
                      <label className={cn("flex items-center gap-2.5", outOfStock ? "cursor-not-allowed" : "cursor-pointer")}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={outOfStock}
                          onChange={() => toggle(item)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        {item.code && <span className="text-xs text-muted-foreground">{item.code}</span>}
                        <span className={cn("text-xs", outOfStock ? "text-destructive" : "text-muted-foreground")}>
                          {outOfStock ? "All out" : `${available}/${item.totalQuantity} available`}
                        </span>
                      </label>
                      {isSelected && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => setQuantity(item._id, selected[item._id].quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{selected[item._id].quantity}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => setQuantity(item._id, selected[item._id].quantity + 1, available)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Input
                            className="h-7 flex-1 min-w-40 text-xs"
                            placeholder="Note (condition, serial, etc.)"
                            value={selected[item._id].takeNote}
                            onChange={(e) => setNote(item._id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{selectedCount} item(s) selected</p>
      </div>

      <Button onClick={submit} disabled={createLog.isPending} className="w-full">
        {createLog.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Log checkout
      </Button>
    </div>
  );
}
