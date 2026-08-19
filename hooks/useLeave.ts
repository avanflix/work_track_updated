"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { LeaveRequestInput } from "@/lib/validations";
import type { ILeaveRequest } from "@/types";

export function useLeaveRequests(scope: "pending" | "mine" = "pending") {
  return useQuery({
    queryKey: ["leave", scope],
    queryFn: () => apiClient.get<{ items: ILeaveRequest[] }>(`/api/leave?scope=${scope}`),
  });
}

export function useRequestLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeaveRequestInput) => apiClient.post("/api/leave", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDecideLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      apiClient.patch(`/api/leave/${id}/${decision}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Withdraw a PENDING or APPROVED leave request (requester only).
 *
 * Invalidates ["leave"] broadly (covers both the "mine" and "pending"
 * query keys, so an approver's pending queue also drops the withdrawn
 * request without a manual refetch), plus ["users"] since withdrawing an
 * APPROVED leave can flip the requester back to available immediately.
 */
export function useWithdrawLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.patch(`/api/leave/${id}/withdraw`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useLeaveApprover() {
  return useQuery({
    queryKey: ["leave-approver"],
    queryFn: () => apiClient.get<{ leaveApprover: string | null; leaveApproverName: string | null }>("/api/leave/approver"),
  });
}

export function useSetLeaveApprover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (adminId: string) => apiClient.patch("/api/leave/approver", { adminId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-approver"] }),
  });
}
