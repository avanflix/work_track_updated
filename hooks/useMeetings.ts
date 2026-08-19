"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateMeetingInput } from "@/lib/validations";
import type { IMeeting } from "@/types";

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: () => apiClient.get<{ items: IMeeting[] }>("/api/meetings"),
    refetchInterval: 30_000,
  });
}

export function useCalendarMeetings() {
  return useQuery({
    queryKey: ["meetings", "calendar"],
    queryFn: () => apiClient.get<{ items: IMeeting[] }>("/api/meetings/calendar"),
    refetchInterval: 30_000,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => apiClient.post<IMeeting>("/api/meetings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCancelMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/meetings/${id}`, { status: "CANCELLED" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useJoinMeeting() {
  return useMutation({
    mutationFn: (meetingId: string) => apiClient.post<{ roomId: string }>(`/api/meetings/${meetingId}/join`, {}),
  });
}

export function useEndMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => apiClient.post(`/api/meetings/${meetingId}/end`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
