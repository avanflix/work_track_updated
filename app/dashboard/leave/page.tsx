"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { LeaveRequestsTable } from "@/components/tables/LeaveRequestsTable";
import { LeaveRequestForm } from "@/components/forms/LeaveRequestForm";
import { LeaveApproverSettings } from "@/components/forms/LeaveApproverSettings";

import {
  useLeaveRequests,
  useLeaveApprover,
} from "@/hooks/useLeave";

export default function LeavePage() {
  const { data: session } = useSession();

  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const isSuperAdmin =
    role === "SUPER_ADMIN";

  const [formOpen, setFormOpen] =
    useState(false);

  const { data: approverData } =
    useLeaveApprover();

  const isApprover =
    isSuperAdmin ||
    approverData?.leaveApprover === userId;

  const pending =
    useLeaveRequests("pending");

  const mine =
    useLeaveRequests("mine");

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Leave
          </h1>

          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Review leave requests submitted by the team."
              : isApprover
                ? "Review leave requests and track your own."
                : "Request leave and track its status."}
          </p>
        </div>

        {/* REQUEST LEAVE */}
        {!isSuperAdmin && (
          <Dialog
            open={formOpen}
            onOpenChange={setFormOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Request leave
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Request leave
                </DialogTitle>

                <DialogDescription>
                  This goes to the Super Admin
                  and the designated approver.
                </DialogDescription>
              </DialogHeader>

              <LeaveRequestForm
                onSuccess={() =>
                  setFormOpen(false)
                }
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* LEAVE APPROVER SETTINGS */}
      {isSuperAdmin && (
        <LeaveApproverSettings />
      )}

      {/* PENDING APPROVALS */}
      {isApprover && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending your approval
            </CardTitle>

            <CardDescription>
              Leave requests waiting for a
              decision.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LeaveRequestsTable
              requests={
                pending.data?.items ?? []
              }
              loading={
                pending.isLoading
              }
              showActions
            />
          </CardContent>
        </Card>
      )}

      {/* MY REQUESTS */}
      {!isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>
              My requests
            </CardTitle>

            <CardDescription>
              Leave you've requested and
              their current status.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LeaveRequestsTable
              requests={
                mine.data?.items ?? []
              }
              loading={
                mine.isLoading
              }

              /*
               * Show Withdraw button for:
               * PENDING
               * APPROVED
               */
              showWithdraw

              /*
               * Refresh the UI after
               * successful withdrawal.
               */
              onWithdrawSuccess={() => {
                mine.refetch();
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}