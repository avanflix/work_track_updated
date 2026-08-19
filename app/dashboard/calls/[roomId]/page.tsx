"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { CallRoom } from "@/components/calls/CallRoom";

export default function CallRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) return null;

  return (
    <Card className="h-[calc(100vh-8rem)] overflow-hidden">
      <CallRoom roomId={roomId} currentUserId={userId} />
    </Card>
  );
}
