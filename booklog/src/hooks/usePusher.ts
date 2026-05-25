"use client";

import { useEffect, useRef } from "react";
import { pusherClient } from "@/lib/pusher";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";

export function usePusherChannel(
  channelName: string | null,
  events: Record<string, (data: unknown) => void>
) {
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!channelName) return;

    const channel = pusherClient.subscribe(channelName);
    channelRef.current = channel;

    for (const [event, handler] of Object.entries(events)) {
      channel.bind(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(events)) {
        channel.unbind(event, handler);
      }
      pusherClient.unsubscribe(channelName);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  return channelRef;
}
