"use client";

import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BookCard } from "@/components/books/BookCard";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect } from "react";

interface Book {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  genres: string[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const debouncedQuery = useDebounce(query, 500);

  const search = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  async function handleAdd(bookId: string) {
    setAddingId(bookId);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, status: "WANT_TO_READ", format: "EBOOK" }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set([...prev, bookId]));
      }
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Search Books</h1>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title, author, or ISBN…"
          className="pl-9 h-11 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                userStatus={addedIds.has(book.id) ? "WANT_TO_READ" : null}
                onAdd={handleAdd}
                isAdding={addingId === book.id}
              />
            ))}
          </div>
        </>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Try a different title, author, or ISBN</p>
        </div>
      )}

      {query.trim().length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Start typing to search for books</p>
        </div>
      )}
    </div>
  );
}
