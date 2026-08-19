"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2, PhoneMissed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoTile } from "@/components/calls/VideoTile";
import { useCallState, useLeaveCall } from "@/hooks/useCalls";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { cn } from "@/lib/utils";

export function CallRoom({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
  const router = useRouter();
  const { data: call, isLoading } = useCallState(roomId);
  const leaveCall = useLeaveCall();
  const [ended, setEnded] = useState(false);

  const others = useMemo(
    () => call?.participants.filter((p: any) => p.user._id !== currentUserId) ?? [],
    [call, currentUserId]
  );
  const activePeers = useMemo(() => others.filter((p: any) => p.status === "JOINED"), [others]);
  const activePeerIds = useMemo(() => activePeers.map((p: any) => p.user._id as string), [activePeers]);

  const { localStream, remoteStreams, connectionStatus, micEnabled, cameraEnabled, mediaError, toggleMic, toggleCamera } =
    useWebRTCCall({
      roomId: call?.status === "ENDED" ? null : roomId,
      currentUserId,
      callType: call?.callType ?? "VIDEO",
      activePeerIds,
    });

  // Call ended, declined, or I was the only one left — bail back automatically.
  useEffect(() => {
    if (call?.status === "ENDED" && !ended) {
      setEnded(true);
      const t = setTimeout(() => router.back(), 2000);
      return () => clearTimeout(t);
    }
  }, [call?.status, ended, router]);

  async function handleLeave() {
    try {
      await leaveCall.mutateAsync(roomId);
    } catch {
      // ignore — we're leaving the page regardless
    }
    router.back();
  }

  if (isLoading || !call) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Connecting…
      </div>
    );
  }

  const isRingingOut =
    call.type === "DIRECT" && call.status === "RINGING" && others.every((p: any) => p.status === "RINGING");
  const wasDeclined = call.type === "DIRECT" && others.some((p: any) => p.status === "DECLINED");

  if (ended || call.status === "ENDED") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <PhoneMissed className="h-8 w-8 opacity-50" />
        {wasDeclined ? "Call declined" : "Call ended"}
      </div>
    );
  }

  const tiles = [
    { userId: currentUserId, name: "You", stream: localStream, isLocal: true, muted: !micEnabled },
    ...activePeers.map((p: any) => ({
      userId: p.user._id,
      name: p.user.name,
      stream: remoteStreams[p.user._id] ?? null,
      isLocal: false,
      muted: false,
      status: connectionStatus[p.user._id],
    })),
  ];

  const failedPeers = activePeers.filter((p: any) => connectionStatus[p.user._id] === "failed");

  return (
    <div className="flex h-full flex-col">
      {mediaError && (
        <div className="bg-destructive/10 px-4 py-2 text-center text-xs font-medium text-destructive">
          {mediaError}
        </div>
      )}

      {failedPeers.length > 0 && (
        <div className="bg-destructive/10 px-4 py-2 text-center text-xs font-medium text-destructive">
          Couldn't establish a connection with {failedPeers.map((p: any) => p.user.name).join(", ")} — this is
          usually a network/firewall on one side blocking the call. Try switching networks (e.g. off restrictive
          office Wi-Fi), or rejoin the call.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isRingingOut ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-20 w-20 animate-pulse rounded-full bg-primary/20" />
            <p className="text-sm font-medium">Calling {others[0]?.user?.name}…</p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3",
              tiles.length <= 1 && "grid-cols-1",
              tiles.length === 2 && "grid-cols-1 sm:grid-cols-2",
              tiles.length >= 3 && "grid-cols-2 lg:grid-cols-3"
            )}
          >
            {tiles.map((t) => (
              <VideoTile
                key={t.userId}
                name={t.name}
                stream={t.stream}
                isLocal={t.isLocal}
                muted={t.muted}
                showVideo={call.callType === "VIDEO"}
                status={(t as any).status}
              />
            ))}
          </div>
        )}

        {others.some((p: any) => p.status === "RINGING") && !isRingingOut && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Waiting for {others.filter((p: any) => p.status === "RINGING").map((p: any) => p.user.name).join(", ")}…
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-border p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMic}
          className={cn(!micEnabled && "bg-destructive/10 text-destructive")}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        {call.callType === "VIDEO" && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleCamera}
            className={cn(!cameraEnabled && "bg-destructive/10 text-destructive")}
          >
            {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
        )}
        <Button variant="destructive" size="icon" onClick={handleLeave} disabled={leaveCall.isPending}>
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
