"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateContactInfo } from "@/hooks/useEmployees";

export function EditContactDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [whatsappOptIn, setWhatsappOptIn] = useState(user?.whatsappOptIn ?? true);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateContactInfo();

  if (!user) return null;

  async function handleSave() {
    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError("Use international format, e.g. +919876543210");
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ id: user._id, phone, whatsappOptIn });
      toast.success("Contact info updated");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update contact info");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp number — {user.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>WhatsApp number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">Include the country code.</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Send task &amp; notification updates on WhatsApp
          </label>

          <Button className="w-full" onClick={handleSave} disabled={update.isPending}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
