"use client";

import { useEffect, useRef } from "react";
import { Loader2, MicOff, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeerConnectionStatus } from "@/hooks/useWebRTCCall";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function VideoTile({
  name,
  stream,
  muted,
  isLocal,
  showVideo,
  speaking,
  status,
}: {
  name: string;
  stream: MediaStream | null;
  muted?: boolean;
  isLocal?: boolean;
  showVideo: boolean;
  speaking?: boolean;
  status?: PeerConnectionStatus;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-secondary",
        speaking && "ring-2 ring-primary"
      )}
    >
      {stream && showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn("h-full w-full object-cover", isLocal && "-scale-x-100")}
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
          {initials(name)}
        </div>
      )}

      {!isLocal && status === "connecting" && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-medium text-white">
          <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
        </div>
      )}
      {!isLocal && status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-center text-xs text-white">
          <WifiOff className="h-5 w-5" />
          <span className="max-w-[80%]">Couldn't connect — likely a network/firewall issue</span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
        {muted && <MicOff className="h-3 w-3" />}
        {isLocal ? `${name} (You)` : name}
      </div>
    </div>
  );
}
