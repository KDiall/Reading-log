"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProgressUpdaterProps {
  userBookId: string;
  currentPage: number | null;
  progressPct: number | null;
  pageCount: number | null;
  onUpdate?: (page: number | null, pct: number | null) => void;
}

export function ProgressUpdater({ userBookId, currentPage, progressPct, pageCount, onUpdate }: ProgressUpdaterProps) {
  const [mode, setMode] = useState<"page" | "pct">(pageCount ? "page" : "pct");
  const [value, setValue] = useState(
    mode === "page" ? String(currentPage ?? "") : String(progressPct != null ? Math.round(progressPct) : "")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { setError("Enter a valid number"); return; }
    setSaving(true);
    setError(null);
    try {
      const body = mode === "page" ? { page: Math.round(num) } : { pct: num };
      const res = await fetch(`/api/library/${userBookId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      onUpdate?.(data.userBook.currentPage, data.userBook.progressPct);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {/* Mode toggle */}
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("page")}
          className={`px-2 py-0.5 rounded border transition-colors ${mode === "page" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
          disabled={!pageCount}
        >
          Page
        </button>
        <button
          type="button"
          onClick={() => setMode("pct")}
          className={`px-2 py-0.5 rounded border transition-colors ${mode === "pct" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
        >
          %
        </button>
      </div>

      <div className="flex gap-1.5 items-center">
        <Input
          type="number"
          min={0}
          max={mode === "page" ? (pageCount ?? undefined) : 100}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "page" ? `of ${pageCount ?? "?"}` : "0–100"}
          className="h-7 text-xs w-24"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
