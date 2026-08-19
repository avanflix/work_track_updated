"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreateClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function ClientForm({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const createClient = useCreateClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit() {
    if (!name.trim()) {
      toast.error("Please provide a client name");
      return;
    }
    try {
      const client: any = await createClient.mutateAsync({ name, description: description || undefined });
      toast.success("Client added");
      setName("");
      setDescription("");
      onSuccess?.(client._id);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add client");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Client name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Studios" />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any extra context about this client" />
      </div>
      <Button onClick={submit} disabled={createClient.isPending} className="w-full">
        {createClient.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add client
      </Button>
    </div>
  );
}
