"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CallKind, ICall, ICallState } from "@/types";

const INCOMING_POLL_MS = 3_000;
const CALL_STATE_POLL_MS = 2_500;

/** Polls for calls currently ringing for me — drives the incoming-call prompt. */
export function useIncomingCalls() {
  return useQuery({
    queryKey: ["calls", "incoming"],
    queryFn: () => apiClient.get<{ items: (ICall & { caller: any })[] }>("/api/calls/incoming"),
    refetchInterval: INCOMING_POLL_MS,
  });
}

export function useStartDirectCall() {
  return useMutation({
    mutationFn: (input: { targetUserId: string; callType: CallKind; conversationId?: string }) =>
      apiClient.post<ICall>("/api/calls", input),
  });
}

export function useAcceptCall() {
  return useMutation({
    mutationFn: (roomId: string) => apiClient.post<ICall>(`/api/calls/${roomId}/accept`, {}),
  });
}

export function useDeclineCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => apiClient.post<ICall>(`/api/calls/${roomId}/decline`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calls", "incoming"] }),
  });
}

export function useLeaveCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => apiClient.post<ICall>(`/api/calls/${roomId}/leave`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calls", "incoming"] }),
  });
}

/** Live state of a call room — who's in it, ringing, or has left. */
export function useCallState(roomId: string | null) {
  return useQuery({
    queryKey: ["calls", "state", roomId],
    queryFn: () => apiClient.get<ICallState>(`/api/calls/${roomId}`),
    enabled: !!roomId,
    refetchInterval: CALL_STATE_POLL_MS,
  });
}
