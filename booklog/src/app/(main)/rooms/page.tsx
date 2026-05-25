"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, Clock, Plus, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_FILTERS = [
  { label: "Upcoming", value: "SCHEDULED" },
  { label: "Live Now", value: "ACTIVE" },
  { label: "Ended", value: "ENDED" },
];

interface Room {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  durationMins: number;
  maxParticipants: number;
  isPublic: boolean;
  book: { id: string; title: string; authors: string[]; coverUrl: string | null };
  host: { username: string; displayName: string; avatarUrl: string | null };
  _count: { participants: number };
}

function formatScheduled(dt: string) {
  return new Date(dt).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("SCHEDULED");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(page) });
      const res = await fetch(`/api/rooms?${params}`);
      const data = await res.json();
      setRooms(data.rooms ?? []);
      setTotalPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7" /> Reading Rooms
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Timed group reading sessions</p>
        </div>
        <Link href="/rooms/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Room</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={statusFilter === f.value ? "default" : "outline"}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
          >
            {f.label}
            {f.value === "ACTIVE" && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No {statusFilter.toLowerCase().replace("_", " ")} rooms</p>
          <Link href="/rooms/new">
            <Button variant="outline" className="mt-3">Create one</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 flex flex-col gap-3 h-full">
                    <div className="flex gap-3">
                      <div className="relative w-12 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                        {room.book.coverUrl ? (
                          <Image src={room.book.coverUrl} alt={room.book.title} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm line-clamp-2 leading-tight">{room.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{room.book.title}</p>
                        <p className="text-xs text-muted-foreground">by {room.host.displayName}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {room.status === "ACTIVE" && (
                        <Badge className="text-xs bg-green-500 hover:bg-green-500">● Live</Badge>
                      )}
                      {room.status === "SCHEDULED" && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />{formatScheduled(room.scheduledAt)}
                        </Badge>
                      )}
                      {room.status === "ENDED" && (
                        <Badge variant="secondary" className="text-xs">Ended</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {room._count.participants}/{room.maxParticipants}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {room.durationMins} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground flex items-center px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
