"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShootLogsTable } from "@/components/tables/ShootLogsTable";
import { ShootLogForm } from "@/components/forms/ShootLogForm";
import { EquipmentCatalogManager } from "@/components/forms/EquipmentCatalogManager";
import { useShootLogs } from "@/hooks/useShoots";
import { can, getWorkLogVisibleRoles } from "@/utils/permissions";

export default function ShootsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canLog = can(role, "CREATE_SHOOT_LOG");
  const canSeeTeam = getWorkLogVisibleRoles(role).length > 0;
  const canManageEquipment = can(role, "MANAGE_EQUIPMENT");

  const [view, setView] = useState<"mine" | "team">("mine");
  const [formOpen, setFormOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const { data, isLoading } = useShootLogs(view);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Shoots</h1>
          <p className="text-sm text-muted-foreground">Equipment material log — what's been taken out, and what's come back.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageEquipment && (
            <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings2 className="h-4 w-4" /> Manage equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Equipment catalog</DialogTitle>
                  <DialogDescription>Add or retire equipment available to log for shoots.</DialogDescription>
                </DialogHeader>
                <EquipmentCatalogManager />
              </DialogContent>
            </Dialog>
          )}
          {canLog && (
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" /> Log checkout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Log equipment checkout</DialogTitle>
                  <DialogDescription>Select what you're taking for the shoot.</DialogDescription>
                </DialogHeader>
                <ShootLogForm onSuccess={() => setFormOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{view === "mine" ? "My logs" : "Team logs"}</CardTitle>
              <CardDescription>
                {view === "mine" ? "Equipment you've checked out." : "Equipment checked out across the team."}
              </CardDescription>
            </div>
            {canSeeTeam && (
              <div className="flex rounded-xl border border-border bg-secondary/40 p-1 text-sm">
                <button
                  onClick={() => setView("mine")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-medium transition-colors",
                    view === "mine" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Mine
                </button>
                <button
                  onClick={() => setView("team")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-medium transition-colors",
                    view === "team" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Team
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ShootLogsTable
            logs={data?.items ?? []}
            loading={isLoading}
            canReturn={view === "mine" ? canLog : canSeeTeam}
            showOwner={view === "team"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
