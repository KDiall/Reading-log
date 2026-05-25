"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface ChallengeActionsProps {
  challengeId: string;
  isAuthenticated: boolean;
  initialJoined: boolean;
  initialProgress: number;
  targetValue: number;
  challengeType: string;
  isActive: boolean;
}

export function ChallengeActions({
  challengeId,
  isAuthenticated,
  initialJoined,
  initialProgress,
  targetValue,
  challengeType,
  isActive,
}: ChallengeActionsProps) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [progress, setProgress] = useState(initialProgress);
  const [loading, setLoading] = useState(false);
  const [manualProgress, setManualProgress] = useState(String(initialProgress));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isManual = challengeType === "GENRE_BINGO" || challengeType === "THEME_BASED";
  const pct = Math.min(100, (progress / targetValue) * 100);

  async function handleJoin() {
    if (!isAuthenticated) { router.push("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setJoined(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Leave this challenge? Your progress will be lost.")) return;
    setLoading(true);
    try {
      await fetch(`/api/challenges/${challengeId}/leave`, { method: "DELETE" });
      setJoined(false);
      setProgress(0);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleProgressSave() {
    setSaving(true);
    setError(null);
    try {
      const val = parseInt(manualProgress, 10);
      if (isNaN(val) || val < 0) { setError("Enter a valid number"); return; }
      const res = await fetch(`/api/challenges/${challengeId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: val }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setProgress(data.userChallenge.progress);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!joined) {
    return (
      <Button onClick={handleJoin} disabled={loading} className="gap-1.5 w-full md:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Join Challenge
      </Button>
    );
  }

  return (
    <Card className="w-full md:w-56">
      <CardContent className="p-4 space-y-3">
        {/* Progress ring */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <svg width={80} height={80} className="-rotate-90">
              <circle cx={40} cy={40} r={32} fill="none" stroke="currentColor" strokeWidth={6}
                className="text-muted/30" />
              <circle cx={40} cy={40} r={32} fill="none" stroke="currentColor" strokeWidth={6}
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={2 * Math.PI * 32 - (pct / 100) * 2 * Math.PI * 32}
                strokeLinecap="round" className="text-primary transition-all" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
              <span className="text-lg font-bold">{progress}</span>
              <span className="text-xs text-muted-foreground">/ {targetValue}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% complete</p>
        </div>

        {/* Manual progress for bingo/theme */}
        {isManual && isActive && (
          <div className="space-y-1.5">
            <Label className="text-xs">Update Progress</Label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min={0}
                value={manualProgress}
                onChange={(e) => setManualProgress(e.target.value)}
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-3" onClick={handleProgressSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-destructive hover:text-destructive"
          onClick={handleLeave}
          disabled={loading}
        >
          <LogOut className="h-3.5 w-3.5" /> Leave
        </Button>
      </CardContent>
    </Card>
  );
}
