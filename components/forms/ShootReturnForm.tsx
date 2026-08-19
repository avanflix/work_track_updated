"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useReturnShootLog } from "@/hooks/useShoots";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { IShootLog } from "@/types";

type Condition = "OK" | "DAMAGED" | "MISSING";

export function ShootReturnForm({ log, onSuccess }: { log: IShootLog; onSuccess?: () => void }) {
  const returnLog = useReturnShootLog();
  const [conditions, setConditions] = useState<Record<string, { returnCondition: Condition; returnNote: string }>>(
    () =>
      Object.fromEntries(
        log.items.map((item) => [item.equipment, { returnCondition: "OK" as Condition, returnNote: "" }])
      )
  );
  const [returnNote, setReturnNote] = useState("");

  async function submit() {
    try {
      await returnLog.mutateAsync({
        id: log._id,
        input: {
          returnNote: returnNote || undefined,
          items: log.items.map((item) => ({
            equipmentId: item.equipment,
            returnCondition: conditions[item.equipment]?.returnCondition ?? "OK",
            returnNote: conditions[item.equipment]?.returnNote || undefined,
          })),
        },
      });
      toast.success("Return logged");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to log return");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {log.items.map((item) => (
          <div key={item.equipment} className="rounded-xl border border-border p-3">
            <p className="text-sm font-medium">
              {item.equipmentName} <span className="text-xs text-muted-foreground">× {item.quantity}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select
                value={conditions[item.equipment]?.returnCondition}
                onValueChange={(v) =>
                  setConditions((prev) => ({ ...prev, [item.equipment]: { ...prev[item.equipment], returnCondition: v as Condition } }))
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK">Returned OK</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="MISSING">Missing</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="h-8 flex-1 min-w-40 text-xs"
                placeholder="Note (optional)"
                value={conditions[item.equipment]?.returnNote}
                onChange={(e) =>
                  setConditions((prev) => ({ ...prev, [item.equipment]: { ...prev[item.equipment], returnNote: e.target.value } }))
                }
              />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Overall return note (optional)</Label>
        <Textarea rows={2} value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="Anything else about this return" />
      </div>
      <Button onClick={submit} disabled={returnLog.isPending} className="w-full">
        {returnLog.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm return
      </Button>
    </div>
  );
}
