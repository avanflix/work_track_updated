"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateClientInput, UpdateClientInput } from "@/lib/validations";
import type { IClient } from "@/types";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => apiClient.get<{ items: IClient[] }>("/api/clients"),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => apiClient.post("/api/clients", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientInput }) => apiClient.patch(`/api/clients/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
