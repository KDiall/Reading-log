"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Send, Loader2, User, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePusherChannel } from "@/hooks/usePusher";

interface Message {
  id: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
  readAt: string | null;
}

interface Partner {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export default function MessageThreadPage() {
  const { username } = useParams<{ username: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (cursor?: string) => {
    const url = `/api/messages/${username}${cursor ? `?cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (res.status === 403) { setBlocked(true); return; }
    const data = await res.json();
    setPartner(data.partner);
    setNextCursor(data.nextCursor);
    if (cursor) {
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
    } else {
      setMessages(data.messages ?? []);
    }
  }, [username]);

  const fetchMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setCurrentUserId(data.user?.id ?? null);
  }, []);

  useEffect(() => {
    Promise.all([fetchMessages(), fetchMe()]).finally(() => setLoading(false));
  }, [fetchMessages, fetchMe]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Real-time incoming DMs
  usePusherChannel(currentUserId ? `private-dm-${currentUserId}` : null, {
    "dm:new-message": (data: unknown) => {
      const d = data as { messageId: string; senderId: string };
      if (d.senderId === partner?.id) {
        // Fetch the latest message
        fetchMessages();
      }
    },
  });

  async function sendMessage() {
    if (!input.trim()) return;
    setSending(true);
    const body = input;
    setInput("");
    try {
      const res = await fetch(`/api/messages/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleBlock() {
    if (!confirm(`Block @${username}? This will hide your conversation.`)) return;
    await fetch(`/api/users/${username}/block`, { method: "POST" });
    setBlocked(true);
    setShowActions(false);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (blocked) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center text-muted-foreground">
        <p className="text-lg font-semibold">Conversation unavailable</p>
        <p className="text-sm mt-2">This conversation is blocked.</p>
        <Link href="/messages"><Button variant="outline" className="mt-4">Back to messages</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-0 max-w-2xl flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 border-b flex-shrink-0">
        <Link href="/messages" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
          {partner?.avatarUrl
            ? <Image src={partner.avatarUrl} alt={partner.displayName} width={32} height={32} className="object-cover rounded-full" />
            : <User className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{partner?.displayName}</p>
          <p className="text-xs text-muted-foreground">@{partner?.username}</p>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowActions(!showActions)}>
            <MoreVertical className="h-4 w-4" />
          </Button>
          {showActions && (
            <Card className="absolute right-0 top-9 z-10 w-36 shadow-lg">
              <button
                className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted/50"
                onClick={handleBlock}
              >
                Block user
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* Load older */}
      {nextCursor && (
        <div className="flex justify-center py-2 flex-shrink-0">
          <Button variant="ghost" size="sm" disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await fetchMessages(nextCursor);
              setLoadingMore(false);
            }}>
            {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Load older messages"}
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((m) => {
          const isOwn = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {m.sender.avatarUrl
                  ? <Image src={m.sender.avatarUrl} alt={m.sender.displayName} width={28} height={28} className="object-cover rounded-full" />
                  : <User className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className={`flex flex-col max-w-xs ${isOwn ? "items-end" : "items-start"}`}>
                <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"}`}>
                  {m.body}
                </div>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {isOwn && m.readAt && <span className="ml-1 text-primary">✓</span>}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t py-3 flex gap-2 flex-shrink-0">
        <Input
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={sending || !input.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
