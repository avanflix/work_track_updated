"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateShootLogInput, ReturnShootLogInput } from "@/lib/validations";
import type { IShootLog } from "@/types";

export function useShootLogs(scope: "mine" | "team" = "mine") {
  return useQuery({
    queryKey: ["shoots", scope],
    queryFn: () => apiClient.get<{ items: IShootLog[] }>(`/api/shoots?scope=${scope}`),
  });
}

export function useCreateShootLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShootLogInput) => apiClient.post("/api/shoots", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shoots"] }),
  });
}

export function useReturnShootLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReturnShootLogInput }) =>
      apiClient.patch(`/api/shoots/${id}/return`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shoots"] }),
  });
}
