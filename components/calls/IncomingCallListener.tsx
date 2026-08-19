"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PhoneCall, PhoneOff, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIncomingCalls, useAcceptCall, useDeclineCall } from "@/hooks/useCalls";

function initials(name: string) {
  return name
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function IncomingCallListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useIncomingCalls();
  const accept = useAcceptCall();
  const decline = useDeclineCall();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const inCallRoom = pathname?.startsWith("/dashboard/calls/");

  const call = (data?.items ?? []).find((c: any) => !dismissedIds.includes(c._id));

  // If we're already looking at the call's room (e.g. reloaded the page),
  // don't also pop the incoming-call dialog on top of it.
  const activeRoomId = pathname?.split("/dashboard/calls/")[1];
  const suppressed = inCallRoom && activeRoomId === call?._id;

  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    // Clear dismissed state once the call is actually gone from the feed
    // (declined/expired elsewhere), so a fresh call with a new id isn't blocked.
    if (data?.items) {
      const liveIds = new Set(data.items.map((c: any) => c._id));
      setDismissedIds((prev) => prev.filter((id) => liveIds.has(id)));
    }
  }, [data]);

  if (!call || suppressed) return null;

  async function handleAccept() {
    if (!call || lastHandled.current === call._id) return;
    lastHandled.current = call._id;
    await accept.mutateAsync(call._id);
    router.push(`/dashboard/calls/${call._id}`);
  }

  async function handleDecline() {
    if (!call) return;
    setDismissedIds((prev) => [...prev, call._id]);
    await decline.mutateAsync(call._id);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && handleDecline()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="sr-only">Incoming call</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">{initials(call.caller?.name ?? "?")}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold">{call.caller?.name ?? "Someone"}</p>
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              {call.callType === "VIDEO" ? <Video className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
              Incoming {call.callType === "VIDEO" ? "video" : "voice"} call…
            </p>
          </div>

          <div className="mt-2 flex gap-3">
            <Button
              variant="destructive"
              className="rounded-full px-6"
              onClick={handleDecline}
              disabled={decline.isPending}
            >
              <PhoneOff className="h-4 w-4" /> Decline
            </Button>
            <Button className="rounded-full px-6" onClick={handleAccept} disabled={accept.isPending}>
              <PhoneCall className="h-4 w-4" /> Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
