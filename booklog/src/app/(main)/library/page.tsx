"use client";

import { useState, useEffect, useCallback } from "react";
import { Library, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserBookCard } from "@/components/library/UserBookCard";
import { ProgressUpdater } from "@/components/library/ProgressUpdater";
import { READING_STATUS_LABELS, type ReadingStatus } from "@/types";

interface UserBook {
  id: string;
  status: ReadingStatus;
  format: "EBOOK" | "AUDIOBOOK";
  currentPage: number | null;
  progressPct: number | null;
  startDate: string | null;
  finishDate: string | null;
  book: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
    pageCount: number | null;
  };
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Currently Reading", value: "CURRENTLY_READING" },
  { label: "Want to Read", value: "WANT_TO_READ" },
  { label: "Finished", value: "FINISHED" },
  { label: "DNF", value: "DNF" },
  { label: "Re-Reading", value: "RE_READING" },
];

const SORT_OPTIONS = [
  { label: "Date Added", value: "dateAdded" },
  { label: "Title", value: "title" },
  { label: "Progress", value: "progress" },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("dateAdded");
  const [order, setOrder] = useState("desc");

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("sort", sort);
      params.set("order", order);
      const res = await fetch(`/api/library?${params}`);
      const data = await res.json();
      setBooks(data.library ?? []);
    } finally {
      setLoading(false);
    }
  }, [status, sort, order]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this book from your library?")) return;
    await fetch(`/api/library/${id}`, { method: "DELETE" });
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  const stats = {
    total: books.length,
    finished: books.filter((b) => b.status === "FINISHED").length,
    reading: books.filter((b) => b.status === "CURRENTLY_READING").length,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Library className="h-7 w-7" />
            My Library
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {stats.total} books · {stats.finished} finished · {stats.reading} reading
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className="text-muted-foreground">Sort:</span>
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            className={`underline-offset-2 ${sort === s.value ? "font-semibold underline" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setSort(s.value)}
          >
            {s.label}
          </button>
        ))}
        <button
          className="ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
        >
          {order === "desc" ? "↓" : "↑"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Library className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">
            {status
              ? `No books with status "${READING_STATUS_LABELS[status as ReadingStatus]}"`
              : "Your library is empty"}
          </p>
          <p className="text-sm mt-1">
            <a href="/search" className="underline underline-offset-4">
              Search for books
            </a>{" "}
            to add them
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {books.map((ub) => (
            <div key={ub.id} className="space-y-1">
              <UserBookCard
                userBook={ub}
                onDelete={handleDelete}
              />
              {ub.status === "CURRENTLY_READING" && (
                <div className="px-3 pb-2">
                  <ProgressUpdater
                    userBookId={ub.id}
                    currentPage={ub.currentPage}
                    progressPct={ub.progressPct}
                    pageCount={ub.book.pageCount}
                    onUpdate={(page, pct) =>
                      setBooks((prev) =>
                        prev.map((b) =>
                          b.id === ub.id ? { ...b, currentPage: page, progressPct: pct } : b
                        )
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
