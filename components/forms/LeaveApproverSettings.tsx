"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useLeaveApprover, useSetLeaveApprover } from "@/hooks/useLeave";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function LeaveApproverSettings() {
  const { data: approverData, isLoading: approverLoading } = useLeaveApprover();
  const { data: adminsData } = useEmployees({ role: "ADMIN" });
  const setApprover = useSetLeaveApprover();
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (approverData?.leaveApprover) setSelected(approverData.leaveApprover);
  }, [approverData?.leaveApprover]);

  async function save() {
    if (!selected) {
      toast.error("Select an admin first");
      return;
    }
    try {
      await setApprover.mutateAsync(selected);
      toast.success("Leave approver updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update leave approver");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Leave approver
        </CardTitle>
        <CardDescription>
          Choose one Admin who, along with you, can approve or reject leave requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {approverData?.leaveApproverName && (
          <p className="text-sm text-muted-foreground">
            Currently: <span className="font-medium text-foreground">{approverData.leaveApproverName}</span>
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 space-y-2">
            <Label>Admin</Label>
            <Select value={selected} onValueChange={setSelected} disabled={approverLoading}>
              <SelectTrigger><SelectValue placeholder="Select an admin" /></SelectTrigger>
              <SelectContent>
                {(adminsData?.items ?? []).map((admin: any) => (
                  <SelectItem key={admin._id} value={admin._id}>{admin.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save} disabled={setApprover.isPending}>
            {setApprover.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
