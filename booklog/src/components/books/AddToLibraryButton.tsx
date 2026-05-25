"use client";

import { useState } from "react";
import { Check, Plus, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { READING_STATUS_LABELS, type ReadingStatus, type BookFormat } from "@/types";

interface AddToLibraryButtonProps {
  bookId: string;
  initialStatus: string | null;
}

const STATUSES: ReadingStatus[] = [
  "WANT_TO_READ",
  "CURRENTLY_READING",
  "FINISHED",
  "DNF",
  "RE_READING",
];

const FORMATS: BookFormat[] = ["EBOOK", "AUDIOBOOK"];

export function AddToLibraryButton({ bookId, initialStatus }: AddToLibraryButtonProps) {
  const [status, setStatus] = useState<ReadingStatus | null>(
    (initialStatus as ReadingStatus) ?? null
  );
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [format, setFormat] = useState<BookFormat>("EBOOK");

  async function addToLibrary(s: ReadingStatus) {
    setLoading(true);
    setShowPicker(false);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, status: s, format }),
      });
      if (res.ok) setStatus(s);
    } finally {
      setLoading(false);
    }
  }

  if (status) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-green-600" />
        <span className="text-muted-foreground">{READING_STATUS_LABELS[status]}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <Button
          onClick={() => addToLibrary("WANT_TO_READ")}
          disabled={loading}
          className="gap-1.5 flex-1"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add to Library
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowPicker((v) => !v)}
          disabled={loading}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {showPicker && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-card border rounded-md shadow-md p-2 w-56">
          <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Format</p>
          <div className="flex gap-1 px-2 pb-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  format === f ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"
                }`}
                onClick={() => setFormat(f)}
              >
                {f === "EBOOK" ? "eBook" : "Audiobook"}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Add as</p>
          {STATUSES.map((s) => (
            <button
              key={s}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
              onClick={() => addToLibrary(s)}
            >
              {READING_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
