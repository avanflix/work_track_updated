"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipmentCatalog, useUpdateEquipment, useDeleteEquipment } from "@/hooks/useEquipment";
import { EquipmentForm } from "@/components/forms/EquipmentForm";
import { Minus, Plus, Trash2 } from "lucide-react";

export function EquipmentCatalogManager() {
  const { data, isLoading } = useEquipmentCatalog(true);
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();

  function toggleActive(id: string, isActive: boolean) {
    toast.promise(updateEquipment.mutateAsync({ id, input: { isActive: !isActive } }), {
      loading: "Updating...",
      success: !isActive ? "Marked as active" : "Retired",
      error: (err) => err?.message ?? "Failed to update",
    });
  }

  function adjustQuantity(id: string, current: number, delta: number) {
    const next = Math.max(1, current + delta);
    updateEquipment.mutate({ id, input: { totalQuantity: next } });
  }

  function remove(id: string) {
    toast.promise(deleteEquipment.mutateAsync(id), {
      loading: "Removing...",
      success: "Removed from catalog",
      error: (err) => err?.message ?? "Failed to remove",
    });
  }

  return (
    <div className="space-y-5">
      <EquipmentForm />

      <div className="space-y-2">
        <p className="text-sm font-medium">Catalog</p>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        )}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No equipment added yet.</p>
        )}
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {(data?.items ?? []).map((item) => (
            <div key={item._id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.category}{item.code ? ` · ${item.code}` : ""}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => adjustQuantity(item._id, item.totalQuantity, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-16 text-center text-xs text-muted-foreground">
                  {item.availableQuantity ?? item.totalQuantity}/{item.totalQuantity}
                </span>
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => adjustQuantity(item._id, item.totalQuantity, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "Active" : "Retired"}</Badge>
              <Button size="sm" variant="outline" onClick={() => toggleActive(item._id, item.isActive)}>
                {item.isActive ? "Retire" : "Activate"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(item._id)} title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

