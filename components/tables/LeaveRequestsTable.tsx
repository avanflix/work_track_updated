"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useDecideLeaveRequest, useWithdrawLeaveRequest } from "@/hooks/useLeave";
import { formatDate } from "@/lib/utils";

import {
  Check,
  X,
  RotateCcw,
} from "lucide-react";

import type { ILeaveRequest } from "@/types";

const STATUS_TONE: Record<
  string,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
};

export function LeaveRequestsTable({
  requests,
  loading,
  showActions = false,
  showWithdraw = false,
  onWithdrawSuccess,
}: {
  requests: ILeaveRequest[];
  loading?: boolean;
  showActions?: boolean;
  showWithdraw?: boolean;
  onWithdrawSuccess?: () => void;
}) {
  const decide = useDecideLeaveRequest();
  const withdraw = useWithdrawLeaveRequest();

  const [withdrawOpen, setWithdrawOpen] =
    useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<ILeaveRequest | null>(null);

  const [withdrawReason, setWithdrawReason] =
    useState("");

  const withdrawing = withdraw.isPending;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map(
          (_, i) => (
            <Skeleton
              key={i}
              className="h-12"
            />
          )
        )}
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No leave requests to show.
      </div>
    );
  }

  function act(
    id: string,
    decision: "approve" | "reject"
  ) {
    toast.promise(
      decide.mutateAsync({
        id,
        decision,
      }),
      {
        loading:
          decision === "approve"
            ? "Approving..."
            : "Rejecting...",

        success:
          decision === "approve"
            ? "Leave approved"
            : "Leave rejected",

        error: (err) =>
          err?.message ??
          "Failed to update leave request",
      }
    );
  }

  function openWithdraw(
    request: ILeaveRequest
  ) {
    setSelectedRequest(request);
    setWithdrawReason("");
    setWithdrawOpen(true);
  }

  async function withdrawLeave() {
    if (!selectedRequest) {
      return;
    }

    try {
      await withdraw.mutateAsync({
        id: selectedRequest._id,
        reason: withdrawReason.trim() || undefined,
      });

      toast.success(
        "Leave request withdrawn"
      );

      setWithdrawOpen(false);
      setSelectedRequest(null);
      setWithdrawReason("");

      /*
       * Query cache invalidation (in useWithdrawLeaveRequest)
       * already refreshes every "leave" list — mine, pending,
       * etc. This callback is only for any extra page-level
       * behavior a caller wants on top of that.
       */
      onWithdrawSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to withdraw leave request"
      );
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              Requested by
            </TableHead>

            <TableHead>
              From
            </TableHead>

            <TableHead>
              To
            </TableHead>

            <TableHead>
              Reason
            </TableHead>

            <TableHead>
              Status
            </TableHead>

            <TableHead>
              Requested
            </TableHead>

            {(showActions ||
              showWithdraw) && (
                <TableHead className="text-right">
                  Actions
                </TableHead>
              )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.map((r) => {
            const canWithdraw =
              showWithdraw &&
              (r.status === "PENDING" ||
                r.status === "APPROVED");

            return (
              <TableRow key={r._id}>
                {/* REQUESTED BY */}
                <TableCell className="font-medium">
                  {r.requestedByName}

                  <span className="ml-1 text-xs text-muted-foreground">
                    (
                    {r.requestedByRole.replace(
                      "_",
                      " "
                    )}
                    )
                  </span>
                </TableCell>

                {/* FROM */}
                <TableCell>
                  {formatDate(
                    r.leaveFrom
                  )}
                </TableCell>

                {/* TO */}
                <TableCell>
                  {formatDate(
                    r.leaveTo
                  )}
                </TableCell>

                {/* REASON */}
                <TableCell
                  className="max-w-64 truncate"
                  title={r.reason}
                >
                  {r.reason}
                </TableCell>

                {/* STATUS */}
                <TableCell>
                  <Badge
                    variant={
                      STATUS_TONE[
                      r.status
                      ] ?? "default"
                    }
                  >
                    {r.status}
                  </Badge>
                </TableCell>

                {/* REQUESTED DATE */}
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(
                    r.createdAt
                  )}
                </TableCell>

                {/* ACTIONS */}
                {(showActions ||
                  showWithdraw) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* APPROVE / REJECT */}
                        {showActions &&
                          r.status ===
                          "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  act(
                                    r._id,
                                    "approve"
                                  )
                                }
                                disabled={
                                  decide.isPending
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  act(
                                    r._id,
                                    "reject"
                                  )
                                }
                                disabled={
                                  decide.isPending
                                }
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          )}

                        {/* WITHDRAW */}
                        {canWithdraw && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openWithdraw(
                                r
                              )
                            }
                            disabled={
                              withdrawing
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Withdraw
                          </Button>
                        )}

                        {/* REVIEW INFORMATION */}
                        {showActions &&
                          r.status !==
                          "PENDING" && (
                            <span className="text-xs text-muted-foreground">
                              {r.reviewedByName
                                ? `${r.status ===
                                  "APPROVED"
                                  ? "Approved"
                                  : "Rejected"
                                } by ${r.reviewedByName
                                }`
                                : "—"}
                            </span>
                          )}
                      </div>
                    </TableCell>
                  )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* WITHDRAW CONFIRMATION */}
      <Dialog
        open={withdrawOpen}
        onOpenChange={(open) => {
          if (!open && !withdrawing) {
            setWithdrawOpen(false);
            setSelectedRequest(null);
            setWithdrawReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Withdraw leave request?
            </DialogTitle>

            <DialogDescription>
              {selectedRequest && (
                <>
                  You are withdrawing your{" "}
                  <strong>
                    {selectedRequest.status.toLowerCase()}
                  </strong>{" "}
                  leave request from{" "}
                  <strong>
                    {formatDate(
                      selectedRequest.leaveFrom
                    )}
                  </strong>{" "}
                  to{" "}
                  <strong>
                    {formatDate(
                      selectedRequest.leaveTo
                    )}
                  </strong>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="withdraw-reason"
              className="text-sm font-medium"
            >
              Reason
              <span className="ml-1 text-xs text-muted-foreground">
                (optional)
              </span>
            </label>

            <Textarea
              id="withdraw-reason"
              placeholder="Enter a reason for withdrawing this leave request..."
              value={withdrawReason}
              onChange={(e) =>
                setWithdrawReason(
                  e.target.value
                )
              }
              disabled={withdrawing}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWithdrawOpen(false)}
              disabled={withdrawing}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={withdrawLeave}
              disabled={withdrawing}
            >
              {withdrawing
                ? "Withdrawing..."
                : "Withdraw leave"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}