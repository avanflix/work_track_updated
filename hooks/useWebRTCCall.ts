"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import type { CallKind } from "@/types";

// STUN alone frequently fails to connect two peers on real-world networks
// (mobile data, most corporate/hotel Wi-Fi, and especially carrier-grade
// NAT — very common in India). When that happens, signaling still
// succeeds (both sides "join") but no media path ever forms, which looks
// exactly like "my video shows, theirs never does."
//
// The Open Relay Project's TURN server is a free, shared fallback so calls
// work out of the box — but its credentials are public and shared by many
// apps, so treat it as a "should mostly work" safety net, not a reliable
// production guarantee. For real reliability, set NEXT_PUBLIC_TURN_URL /
// NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL to your own TURN
// account (Metered.ca, Twilio, Cloudflare, or self-hosted coturn) — these
// must be NEXT_PUBLIC_ since this code runs in the browser.
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  const customUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const customUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const customCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (customUrl) {
    servers.push({
      urls: customUrl.split(",").map((u) => u.trim()),
      username: customUsername,
      credential: customCredential,
    });
  }

  return servers;
}

const ICE_SERVERS = buildIceServers();
const SIGNAL_POLL_MS = 1500;

export type PeerConnectionStatus = "connecting" | "connected" | "failed";

interface UseWebRTCCallArgs {
  roomId: string | null;
  currentUserId: string;
  callType: CallKind;
  /** Other participants currently JOINED in the room — drives who to connect to. */
  activePeerIds: string[];
}

export function useWebRTCCall({ roomId, currentUserId, callType, activePeerIds }: UseWebRTCCallArgs) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, PeerConnectionStatus>>({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(callType === "VIDEO");
  const [mediaError, setMediaError] = useState<string | null>(null);

  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const lastPollRef = useRef<string | undefined>(undefined);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Stable key so effects don't re-run just because a new array instance
  // with the same members was passed in.
  const peerKey = useMemo(() => [...activePeerIds].sort().join(","), [activePeerIds]);

  // 1. Acquire local media once per room.
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "VIDEO",
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err: any) {
        setMediaError(
          err?.name === "NotAllowedError"
            ? "Camera/microphone access was blocked. Allow access and rejoin."
            : err?.message ?? "Couldn't access camera/microphone"
        );
      }
    })();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    };
  }, [roomId, callType]);

  const createPeerConnection = useCallback(
    (remoteUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: event.streams[0] }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          apiClient
            .post(`/api/calls/${roomId}/signal`, {
              to: remoteUserId,
              type: "ICE_CANDIDATE",
              payload: event.candidate.toJSON(),
            })
            .catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionStatus((prev) => ({ ...prev, [remoteUserId]: "connected" }));
        } else if (pc.connectionState === "failed") {
          // Most common cause: no viable peer-to-peer/TURN path between
          // the two networks. Try one ICE restart before giving up and
          // surfacing it as failed.
          setConnectionStatus((prev) => ({ ...prev, [remoteUserId]: "connecting" }));
          restartConnection(remoteUserId, pc).catch(() =>
            setConnectionStatus((prev) => ({ ...prev, [remoteUserId]: "failed" }))
          );
        } else if (pc.connectionState === "disconnected") {
          setConnectionStatus((prev) => ({ ...prev, [remoteUserId]: "connecting" }));
        }
      };

      peersRef.current[remoteUserId] = pc;
      setConnectionStatus((prev) => ({ ...prev, [remoteUserId]: "connecting" }));
      return pc;
    },
    [roomId]
  );

  const restartConnection = useCallback(
    async (remoteUserId: string, pc: RTCPeerConnection) => {
      if (!roomId) return;
      // Only the deterministic offerer re-offers, same tie-break as initial connect.
      if (currentUserId >= remoteUserId) return;

      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await apiClient.post(`/api/calls/${roomId}/signal`, {
        to: remoteUserId,
        type: "OFFER",
        payload: offer,
      });

      // Give the restart a few seconds; if it hasn't recovered, call it failed.
      setTimeout(() => {
        if (peersRef.current[remoteUserId]?.connectionState === "failed") {
          setConnectionStatus((prev) => ({ ...prev, [remoteUserId]: "failed" }));
        }
      }, 8000);
    },
    [roomId, currentUserId]
  );

  const ensureConnection = useCallback(
    async (remoteUserId: string) => {
      if (!roomId || !localStreamRef.current || peersRef.current[remoteUserId]) return;

      const pc = createPeerConnection(remoteUserId);

      // Deterministic offerer so both sides don't send offers at once (glare).
      const iOffer = currentUserId < remoteUserId;
      if (iOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await apiClient.post(`/api/calls/${roomId}/signal`, {
          to: remoteUserId,
          type: "OFFER",
          payload: offer,
        });
      }
    },
    [roomId, currentUserId, createPeerConnection]
  );

  // 2. Connect to every currently-active peer once local media is ready.
  useEffect(() => {
    if (!localStream) return;
    peerKey
      .split(",")
      .filter((id) => id && id !== currentUserId)
      .forEach((id) => ensureConnection(id));
  }, [localStream, peerKey, currentUserId, ensureConnection]);

  // 3. Poll for signaling messages addressed to me and react to them.
  useEffect(() => {
    if (!roomId || !localStream) return;
    let cancelled = false;
    let inFlight = false;

    async function handleSignal(sig: any) {
      const remoteUserId = sig.from as string;
      let pc = peersRef.current[remoteUserId];

      if (sig.type === "OFFER") {
        if (!pc) pc = createPeerConnection(remoteUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        for (const c of pendingCandidatesRef.current[remoteUserId] ?? []) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingCandidatesRef.current[remoteUserId] = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await apiClient.post(`/api/calls/${roomId}/signal`, {
          to: remoteUserId,
          type: "ANSWER",
          payload: answer,
        });
      } else if (sig.type === "ANSWER") {
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          for (const c of pendingCandidatesRef.current[remoteUserId] ?? []) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          pendingCandidatesRef.current[remoteUserId] = [];
        }
      } else if (sig.type === "ICE_CANDIDATE") {
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(sig.payload)).catch(() => {});
        } else {
          pendingCandidatesRef.current[remoteUserId] = [
            ...(pendingCandidatesRef.current[remoteUserId] ?? []),
            sig.payload,
          ];
        }
      }
    }

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const qs = lastPollRef.current ? `?since=${encodeURIComponent(lastPollRef.current)}` : "";
        const res = await apiClient.get<{ items: any[] }>(`/api/calls/${roomId}/signal${qs}`);
        for (const sig of res.items) {
          lastPollRef.current = sig.createdAt;
          await handleSignal(sig);
        }
      } catch {
        // transient poll failures are fine, next tick retries
      } finally {
        inFlight = false;
      }
    }

    const interval = setInterval(() => !cancelled && poll(), SIGNAL_POLL_MS);
    poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, localStream, createPeerConnection]);

  // 4. Tear down connections to peers who left.
  useEffect(() => {
    const activeSet = new Set(peerKey.split(",").filter(Boolean));
    Object.keys(peersRef.current).forEach((id) => {
      if (!activeSet.has(id)) {
        peersRef.current[id].close();
        delete peersRef.current[id];
        delete pendingCandidatesRef.current[id];
        setRemoteStreams((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setConnectionStatus((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
  }, [peerKey]);

  // Full cleanup on unmount / room change.
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      pendingCandidatesRef.current = {};
      setRemoteStreams({});
      setConnectionStatus({});
    };
  }, [roomId]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setMicEnabled((prev) => {
      const next = !prev;
      stream.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setCameraEnabled((prev) => {
      const next = !prev;
      stream.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  return {
    localStream,
    remoteStreams,
    connectionStatus,
    micEnabled,
    cameraEnabled,
    mediaError,
    toggleMic,
    toggleCamera,
  };
}
