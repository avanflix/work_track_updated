"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreateEquipment } from "@/hooks/useEquipment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const CATEGORIES = ["CAMERA", "LENS", "AUDIO", "LIGHTING", "GRIP", "DRONE", "STORAGE", "OTHER"] as const;

export function EquipmentForm({ onSuccess }: { onSuccess?: () => void }) {
  const createEquipment = useCreateEquipment();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("CAMERA");
  const [code, setCode] = useState("");
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  async function submit() {
    if (!name.trim()) {
      toast.error("Please provide an equipment name");
      return;
    }
    try {
      await createEquipment.mutateAsync({ name, category, code: code || undefined, totalQuantity, notes: notes || undefined });
      toast.success("Equipment added to the catalog");
      setName("");
      setCode("");
      setTotalQuantity(1);
      setNotes("");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add equipment");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sony A7S III" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Code / tag (optional)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CAM-001" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Quantity owned</Label>
        <Input
          type="number"
          min={1}
          value={totalQuantity}
          onChange={(e) => setTotalQuantity(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra details" />
      </div>
      <Button onClick={submit} disabled={createEquipment.isPending} className="w-full">
        {createEquipment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add equipment
      </Button>
    </div>
  );
}
