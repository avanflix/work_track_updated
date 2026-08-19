"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "@/lib/validations";
import type { IEquipment } from "@/types";

export function useEquipmentCatalog(all = false) {
  return useQuery({
    queryKey: ["equipment", all],
    queryFn: () => apiClient.get<{ items: IEquipment[] }>(`/api/equipment${all ? "?all=1" : ""}`),
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEquipmentInput) => apiClient.post("/api/equipment", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEquipmentInput }) =>
      apiClient.patch(`/api/equipment/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/equipment/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}
