"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Users, Send, ArrowLeft, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePusherChannel } from "@/hooks/usePusher";
import { useRoomTimer, formatMs } from "@/hooks/useRoomTimer";

interface Participant {
  id: string;
  userId: string;
  pagesLogged: number;
  shareProgress: boolean;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

interface RoomMessage {
  id: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
}

interface Room {
  id: string;
  title: string;
  status: string;
  durationMins: number;
  breakMins: number | null;
  maxParticipants: number;
  chatLocked: boolean;
  startedAt: string | null;
  endedAt: string | null;
  hostId: string;
  book: { id: string; title: string; authors: string[]; coverUrl: string | null; pageCount: number | null };
  host: { id: string; username: string; displayName: string; avatarUrl: string | null };
  participants: Participant[];
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [progressInput, setProgressInput] = useState("");
  const [loggingProgress, setLoggingProgress] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [breakEndsAt, setBreakEndsAt] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const remaining = useRoomTimer(room?.startedAt ?? null, room?.durationMins ?? 60);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${id}`);
    const data = await res.json();
    if (!res.ok) { router.push("/rooms"); return; }
    setRoom(data.room);
    setIsParticipant(data.isParticipant);
    setParticipants(data.room.participants);
  }, [id, router]);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/rooms/${id}/messages`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, [id]);

  const fetchMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setCurrentUserId(data.user?.id ?? null);
  }, []);

  useEffect(() => {
    Promise.all([fetchRoom(), fetchMessages(), fetchMe()]).finally(() => setLoading(false));
  }, [fetchRoom, fetchMessages, fetchMe]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pusher events
  usePusherChannel(room ? `private-room-${id}` : null, {
    "room:state-changed": (data: unknown) => {
      const d = data as { status: string; startedAt?: string; endedAt?: string; breakEndsAt?: string };
      setRoom((prev) => prev ? { ...prev, status: d.status, startedAt: d.startedAt ?? prev.startedAt, endedAt: d.endedAt ?? prev.endedAt } : prev);
      if (d.breakEndsAt) setBreakEndsAt(new Date(d.breakEndsAt));
    },
    "room:message": (data: unknown) => {
      setMessages((prev) => [...prev, data as RoomMessage]);
    },
  });

  usePusherChannel(room ? `presence-room-${id}` : null, {
    "room:participant-joined": (data: unknown) => {
      const d = data as { participant: Participant };
      setParticipants((prev) => [...prev.filter(p => p.userId !== d.participant.userId), d.participant]);
    },
    "room:progress-updated": (data: unknown) => {
      const d = data as { userId: string; page: number | null; pct: number | null };
      setParticipants((prev) => prev.map((p) =>
        p.userId === d.userId && d.page !== null ? { ...p, pagesLogged: d.page! } : p
      ));
    },
  });

  async function handleJoin() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/rooms/${id}/join`, { method: "POST" });
      if (res.ok) { setIsParticipant(true); fetchRoom(); }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStart() {
    setActionLoading(true);
    try { await fetch(`/api/rooms/${id}/start`, { method: "POST" }); }
    finally { setActionLoading(false); }
  }

  async function handleBreak() {
    setActionLoading(true);
    try { await fetch(`/api/rooms/${id}/break`, { method: "POST" }); }
    finally { setActionLoading(false); }
  }

  async function handleEnd() {
    if (!confirm("End this session for all participants?")) return;
    setActionLoading(true);
    try { await fetch(`/api/rooms/${id}/end`, { method: "POST" }); }
    finally { setActionLoading(false); }
  }

  async function sendMessage() {
    if (!chatInput.trim()) return;
    setSendingMsg(true);
    try {
      await fetch(`/api/rooms/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: chatInput }),
      });
      setChatInput("");
    } finally {
      setSendingMsg(false);
    }
  }

  async function logProgress() {
    const page = parseInt(progressInput, 10);
    if (isNaN(page)) return;
    setLoggingProgress(true);
    try {
      await fetch(`/api/rooms/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });
      setProgressInput("");
    } finally {
      setLoggingProgress(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!room) return null;

  const isHost = currentUserId === room.hostId;
  const chatLocked = room.status === "ACTIVE" && room.chatLocked;
  const statusColor = room.status === "ACTIVE" ? "bg-green-500" : room.status === "ON_BREAK" ? "bg-amber-500" : "bg-muted";

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Link href="/rooms" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> All Rooms
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start">
        <div className="relative w-16 h-22 rounded bg-muted overflow-hidden flex-shrink-0" style={{ height: 88 }}>
          {room.book.coverUrl && <Image src={room.book.coverUrl} alt={room.book.title} fill className="object-cover" sizes="64px" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <Badge variant="outline" className="text-xs capitalize">{room.status.toLowerCase().replace("_", " ")}</Badge>
          </div>
          <h1 className="text-2xl font-bold line-clamp-2">{room.title}</h1>
          <p className="text-sm text-muted-foreground">{room.book.title} · {room.durationMins} min session</p>
          <p className="text-xs text-muted-foreground mt-0.5">Host: @{room.host.username}</p>
        </div>

        {/* Timer */}
        {room.status === "ACTIVE" && remaining !== null && (
          <div className="text-center flex-shrink-0">
            <div className="text-4xl font-mono font-bold tabular-nums">
              {formatMs(remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">remaining</p>
          </div>
        )}
        {room.status === "ON_BREAK" && (
          <div className="text-center flex-shrink-0">
            <Badge className="text-sm bg-amber-500 hover:bg-amber-500">☕ On Break</Badge>
          </div>
        )}
      </div>

      {/* Join / host controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        {!isParticipant && room.status !== "ENDED" && (
          <Button onClick={handleJoin} disabled={actionLoading} className="gap-1.5">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Join Room
          </Button>
        )}
        {isHost && room.status === "SCHEDULED" && (
          <Button onClick={handleStart} disabled={actionLoading} className="gap-1.5">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start Session
          </Button>
        )}
        {isHost && room.status === "ACTIVE" && (
          <>
            <Button variant="outline" onClick={handleBreak} disabled={actionLoading}>Take Break</Button>
            <Button variant="destructive" onClick={handleEnd} disabled={actionLoading}>End Session</Button>
          </>
        )}
        {isHost && room.status === "ON_BREAK" && (
          <Button onClick={handleStart} disabled={actionLoading}>Resume Session</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participants */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Participants ({participants.length}/{room.maxParticipants})
          </h2>
          <div className="space-y-2">
            {participants.map((p) => {
              const pct = room.book.pageCount && p.pagesLogged
                ? Math.min(100, (p.pagesLogged / room.book.pageCount) * 100)
                : null;
              return (
                <Card key={p.id} className={p.userId === currentUserId ? "border-primary/50" : ""}>
                  <CardContent className="p-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.user.avatarUrl
                        ? <Image src={p.user.avatarUrl} alt={p.user.displayName} width={28} height={28} className="object-cover" />
                        : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{p.user.displayName}</p>
                      {pct !== null && (
                        <div className="h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    {p.pagesLogged > 0 && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">{p.pagesLogged}p</span>
                    )}
                    {p.userId === room.hostId && (
                      <Badge className="text-xs py-0 h-4 flex-shrink-0">Host</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Progress logger */}
          {isParticipant && (room.status === "ACTIVE" || room.status === "ON_BREAK") && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Log Progress</p>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  placeholder={`Page ${room.book.pageCount ? `(of ${room.book.pageCount})` : ""}`}
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && logProgress()}
                />
                <Button size="sm" className="h-8" onClick={logProgress} disabled={loggingProgress}>
                  {loggingProgress ? <Loader2 className="h-3 w-3 animate-spin" /> : "Log"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col">
          <h2 className="font-semibold text-sm mb-2 flex items-center gap-2">
            Chat
            {chatLocked && <Badge variant="outline" className="text-xs">🔒 Locked during reading</Badge>}
          </h2>
          <Card className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-96">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {chatLocked ? "Chat unlocks on break or when the session ends." : "No messages yet."}
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.senderId === currentUserId ? "flex-row-reverse" : ""}`}>
                    <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {m.sender.avatarUrl
                        ? <Image src={m.sender.avatarUrl} alt={m.sender.displayName} width={24} height={24} className="object-cover" />
                        : <User className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className={`max-w-xs ${m.senderId === currentUserId ? "items-end" : "items-start"} flex flex-col`}>
                      <span className="text-xs text-muted-foreground mb-0.5">{m.sender.displayName}</span>
                      <div className={`px-3 py-1.5 rounded-2xl text-sm ${m.senderId === currentUserId
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"}`}>
                        {m.body}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            {isParticipant && !chatLocked && (
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Send a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={sendingMsg}
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8 w-8 p-0" onClick={sendMessage} disabled={sendingMsg || !chatInput.trim()}>
                  {sendingMsg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </Card>

          {/* Session recap */}
          {room.status === "ENDED" && (
            <Card className="mt-4">
              <CardContent className="p-4 text-center">
                <p className="font-semibold">Session Ended</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {participants.length} readers · {participants.reduce((s, p) => s + p.pagesLogged, 0)} total pages logged
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
