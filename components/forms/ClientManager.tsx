"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { ClientForm } from "@/components/forms/ClientForm";
import { Trash2 } from "lucide-react";

export function ClientManager({ onCreated }: { onCreated?: (id: string) => void }) {
  const { data, isLoading } = useClients();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  function toggleActive(id: string, isActive: boolean) {
    toast.promise(updateClient.mutateAsync({ id, input: { isActive: !isActive } }), {
      loading: "Updating...",
      success: !isActive ? "Client reactivated" : "Client archived",
      error: (err) => err?.message ?? "Failed to update",
    });
  }

  function remove(id: string) {
    toast.promise(deleteClient.mutateAsync(id), {
      loading: "Removing...",
      success: "Client removed",
      error: (err) => err?.message ?? "Failed to remove",
    });
  }

  return (
    <div className="space-y-5">
      <ClientForm onSuccess={onCreated} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Clients</p>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        )}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No clients added yet.</p>
        )}
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {(data?.items ?? []).map((client) => (
            <div key={client._id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
              <Badge variant={client.isActive ? "success" : "secondary"}>{client.isActive ? "Active" : "Archived"}</Badge>
              <Button size="sm" variant="outline" onClick={() => toggleActive(client._id, client.isActive)}>
                {client.isActive ? "Archive" : "Reactivate"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(client._id)} title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
