"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Conversation {
  partner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  lastMessage: { body: string; createdAt: string; isOwn: boolean };
  unread: number;
}

export default function MessagesPage() {
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => setInbox(d.inbox ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <MessageCircle className="h-6 w-6" /> Messages
      </h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : inbox.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No conversations yet</p>
          <p className="text-sm mt-1">Visit a user&apos;s profile to send them a message</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inbox.map((conv) => (
            <Link key={conv.partner.username} href={`/messages/${conv.partner.username}`}>
              <Card className={`hover:shadow-md transition-shadow ${conv.unread > 0 ? "border-primary/50" : ""}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {conv.partner.avatarUrl
                      ? <Image src={conv.partner.avatarUrl} alt={conv.partner.displayName} width={40} height={40} className="object-cover rounded-full" />
                      : <User className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{conv.partner.displayName}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(conv.lastMessage.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {conv.lastMessage.isOwn ? "You: " : ""}{conv.lastMessage.body}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <Badge className="flex-shrink-0 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {conv.unread}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
