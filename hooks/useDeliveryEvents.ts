"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateDeliveryEventInput, UpdateDeliveryEventInput } from "@/lib/validations";
import type { IDeliveryEvent } from "@/types";

export function useDeliveryEvents(clientId: string | undefined, year?: number) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));

  return useQuery({
    queryKey: ["deliveries", clientId, year],
    queryFn: () => apiClient.get<{ items: IDeliveryEvent[] }>(`/api/clients/${clientId}/deliveries?${params.toString()}`),
    enabled: !!clientId,
  });
}

export function useCreateDeliveryEvent(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeliveryEventInput) => apiClient.post(`/api/clients/${clientId}/deliveries`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries", clientId] }),
  });
}

export function useUpdateDeliveryEvent(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: UpdateDeliveryEventInput }) =>
      apiClient.patch(`/api/clients/${clientId}/deliveries/${eventId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries", clientId] }),
  });
}

export function useDeleteDeliveryEvent(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => apiClient.delete(`/api/clients/${clientId}/deliveries/${eventId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries", clientId] }),
  });
}
