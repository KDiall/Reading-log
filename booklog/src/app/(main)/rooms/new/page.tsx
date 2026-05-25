"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { BookOpen, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDebounce } from "@/hooks/useDebounce";

interface BookResult {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
}

interface FormValues {
  title: string;
  scheduledAt: string;
  durationMins: string;
  breakMins: string;
  maxParticipants: string;
  isPublic: boolean;
}

const DURATION_OPTIONS = [
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "60 min", value: "60" },
  { label: "90 min", value: "90" },
  { label: "120 min", value: "120" },
];

export default function NewRoomPage() {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<BookResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } =
    useForm<FormValues>({
      defaultValues: { durationMins: "60", breakMins: "5", maxParticipants: "20", isPublic: true, title: "", scheduledAt: "" },
    });

  const isPublic = watch("isPublic");

  const debouncedQuery = useDebounce(bookQuery, 350);

  const searchBooks = useCallback(async (q: string) => {
    if (!q.trim()) { setBookResults([]); return; }
    setSearchingBooks(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBookResults(data.results ?? []);
    } finally {
      setSearchingBooks(false);
    }
  }, []);

  useState(() => {
    if (debouncedQuery) searchBooks(debouncedQuery);
    else setBookResults([]);
  });

  // watch for debounced query changes
  const [lastQuery, setLastQuery] = useState("");
  if (debouncedQuery !== lastQuery) {
    setLastQuery(debouncedQuery);
    searchBooks(debouncedQuery);
  }

  async function onSubmit(values: FormValues) {
    if (!selectedBook) { setFormError("Please select a book"); return; }
    setFormError(null);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: selectedBook.id,
        title: values.title,
        scheduledAt: values.scheduledAt,
        durationMins: parseInt(values.durationMins, 10),
        breakMins: parseInt(values.breakMins, 10) || 0,
        maxParticipants: parseInt(values.maxParticipants, 10),
        isPublic: values.isPublic,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setFormError(data.error ?? "Failed to create room"); return; }
    router.push(`/rooms/${data.room.id}`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <BookOpen className="h-6 w-6" /> Create a Reading Room
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Book picker */}
        <Card>
          <CardHeader className="pb-2 font-semibold text-sm">Book *</CardHeader>
          <CardContent className="space-y-3">
            {selectedBook ? (
              <div className="flex items-center gap-3 p-2 border rounded-lg">
                <div className="relative w-10 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                  {selectedBook.coverUrl && (
                    <Image src={selectedBook.coverUrl} alt={selectedBook.title} fill className="object-cover" sizes="40px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{selectedBook.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedBook.authors[0]}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBook(null)}>Change</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for a book…"
                    className="pl-9"
                    value={bookQuery}
                    onChange={(e) => setBookQuery(e.target.value)}
                  />
                </div>
                {searchingBooks && <p className="text-xs text-muted-foreground">Searching…</p>}
                {bookResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                    {bookResults.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 text-left"
                        onClick={() => { setSelectedBook(b); setBookQuery(""); setBookResults([]); }}
                      >
                        <div className="relative w-8 h-11 rounded bg-muted overflow-hidden flex-shrink-0">
                          {b.coverUrl && <Image src={b.coverUrl} alt={b.title} fill className="object-cover" sizes="32px" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{b.title}</p>
                          <p className="text-xs text-muted-foreground">{b.authors[0]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader className="pb-2 font-semibold text-sm">Room Details</CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="e.g. Sunday Morning Read-Along" {...register("title", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scheduledAt">Scheduled Date & Time *</Label>
              <Input id="scheduledAt" type="datetime-local" {...register("scheduledAt", { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="durationMins">Duration</Label>
                <select id="durationMins" {...register("durationMins")}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="breakMins">Break (min)</Label>
                <Input id="breakMins" type="number" min={0} max={30} {...register("breakMins")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input id="maxParticipants" type="number" min={2} max={50} {...register("maxParticipants")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={(e) => setValue("isPublic", e.target.checked)} className="rounded" />
              <div>
                <p className="font-medium text-sm">Public room</p>
                <p className="text-xs text-muted-foreground">Anyone can discover and join this room</p>
              </div>
            </label>
          </CardContent>
        </Card>

        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Create Room
        </Button>
      </form>
    </div>
  );
}
