"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRequestLeave } from "@/hooks/useLeave";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function LeaveRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const requestLeave = useRequestLeave();
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [reason, setReason] = useState("");

  async function submit() {
    if (!leaveFrom || !leaveTo) {
      toast.error("Please pick a start and end date");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please describe the reason for leave");
      return;
    }
    try {
      await requestLeave.mutateAsync({ leaveFrom, leaveTo, reason });
      toast.success("Leave request submitted for approval");
      setLeaveFrom("");
      setLeaveTo("");
      setReason("");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit leave request");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Reason</Label>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you requesting leave?" />
      </div>
      <Button onClick={submit} disabled={requestLeave.isPending} className="w-full">
        {requestLeave.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit request
      </Button>
    </div>
  );
}
