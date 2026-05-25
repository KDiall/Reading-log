"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Trophy, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  BOOK_COUNT: "Book Count",
  PAGE_COUNT: "Page Count",
  GENRE_BINGO: "Genre Bingo",
  THEME_BASED: "Theme",
};

const CHALLENGE_TYPE_COLORS: Record<string, string> = {
  BOOK_COUNT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PAGE_COUNT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  GENRE_BINGO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  THEME_BASED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Ended", value: "ended" },
];

const TYPE_FILTERS = [
  { label: "All Types", value: "" },
  { label: "Book Count", value: "BOOK_COUNT" },
  { label: "Page Count", value: "PAGE_COUNT" },
  { label: "Genre Bingo", value: "GENRE_BINGO" },
  { label: "Theme", value: "THEME_BASED" },
];

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  type: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  _count: { participants: number };
}

function getChallengeStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="text-primary transition-all" />
    </svg>
  );
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/challenges?${params}`);
      const data = await res.json();
      setChallenges(data.challenges ?? []);
      setTotalPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  function handleFilterChange(type: "status" | "type", value: string) {
    setPage(1);
    if (type === "status") setStatusFilter(value);
    else setTypeFilter(value);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7" /> Reading Challenges
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Join community challenges and track your reading goals
          </p>
        </div>
        <Link href="/challenges/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New Challenge
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={statusFilter === f.value ? "default" : "outline"}
            onClick={() => handleFilterChange("status", f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPE_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={typeFilter === f.value ? "default" : "outline"}
            onClick={() => handleFilterChange("type", f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No challenges found</p>
          <Link href="/challenges/new">
            <Button variant="outline" className="mt-3">Create the first one</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((c) => {
              const status = getChallengeStatus(c.startDate, c.endDate);
              return (
                <Link key={c.id} href={`/challenges/${c.id}`}>
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-4 flex flex-col gap-3 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold line-clamp-2 leading-tight">{c.title}</h3>
                          {c.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                          )}
                        </div>
                        <ProgressRing pct={0} size={44} />
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHALLENGE_TYPE_COLORS[c.type]}`}>
                          {CHALLENGE_TYPE_LABELS[c.type]}
                        </span>
                        <Badge
                          variant={status === "active" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {status === "active" ? "Active" : status === "upcoming" ? "Upcoming" : "Ended"}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {c._count.participants} joined
                        </span>
                        <span>Goal: {c.targetValue}</span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {formatDate(c.startDate)} — {formatDate(c.endDate)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground flex items-center px-2">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
