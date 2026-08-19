"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreateHoliday } from "@/hooks/useHolidays";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function HolidayForm({ onSuccess }: { onSuccess?: () => void }) {
  const createHoliday = useCreateHoliday();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"PUBLIC" | "OPTIONAL">("PUBLIC");
  const [description, setDescription] = useState("");

  async function submit() {
    if (!title.trim() || !date) {
      toast.error("Please provide a title and date");
      return;
    }
    try {
      await createHoliday.mutateAsync({ title, date, type, description: description || undefined });
      toast.success("Holiday added to the calendar");
      setTitle("");
      setDate("");
      setDescription("");
      setType("PUBLIC");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add holiday");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali" />
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as "PUBLIC" | "OPTIONAL")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public holiday</SelectItem>
            <SelectItem value="OPTIONAL">Optional holiday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any extra details" />
      </div>
      <Button onClick={submit} disabled={createHoliday.isPending} className="w-full">
        {createHoliday.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add holiday
      </Button>
    </div>
  );
}
