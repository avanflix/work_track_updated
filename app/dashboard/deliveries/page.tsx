"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { DeliveryCalendar } from "@/components/dashboard/DeliveryCalendar";
import { ClientManager } from "@/components/forms/ClientManager";
import { useClients } from "@/hooks/useClients";
import { useDeliveryEvents } from "@/hooks/useDeliveryEvents";
import { can } from "@/utils/permissions";

export default function DeliveriesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const manage = can(role, "MANAGE_CLIENTS");

  const { data: clientsData, isLoading: clientsLoading } = useClients();
  const [clientId, setClientId] = useState<string>("");
  const [anchor, setAnchor] = useState(new Date());
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!clientId && clientsData?.items?.length) {
      setClientId(clientsData.items[0]._id);
    }
  }, [clientsData, clientId]);

  const { data: eventsData, isLoading: eventsLoading } = useDeliveryEvents(clientId, anchor.getFullYear());
  const selectedClient = clientsData?.items?.find((c) => c._id === clientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Delivery Calendar</h1>
          <p className="text-sm text-muted-foreground">Content delivery dates by client.</p>
        </div>
        {manage && (
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings2 className="h-4 w-4" /> Manage clients
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Clients</DialogTitle>
                <DialogDescription>Add a client to give them their own delivery calendar.</DialogDescription>
              </DialogHeader>
              <ClientManager onCreated={(id) => { setClientId(id); setManageOpen(false); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-56 space-y-2">
              <CardTitle>Select client</CardTitle>
              <Select value={clientId} onValueChange={setClientId} disabled={clientsLoading}>
                <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
                <SelectContent>
                  {(clientsData?.items ?? []).map((client) => (
                    <SelectItem key={client._id} value={client._id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClient?.description && (
              <CardDescription className="max-w-sm">{selectedClient.description}</CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!clientsLoading && (clientsData?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {manage ? "Add a client to start their delivery calendar." : "No clients have been set up yet."}
            </p>
          ) : clientId ? (
            <DeliveryCalendar
              clientId={clientId}
              events={eventsData?.items ?? []}
              loading={eventsLoading}
              canManage={manage}
              anchor={anchor}
              onAnchorChange={setAnchor}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
