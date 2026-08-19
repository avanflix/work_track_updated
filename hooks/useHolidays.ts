"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateHolidayInput } from "@/lib/validations";
import type { IHoliday } from "@/types";

export function useHolidays(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));

  return useQuery({
    queryKey: ["holidays", year, month],
    queryFn: () => apiClient.get<{ items: IHoliday[] }>(`/api/holidays?${params.toString()}`),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHolidayInput) => apiClient.post("/api/holidays", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/holidays/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holidays"] }),
  });
}
