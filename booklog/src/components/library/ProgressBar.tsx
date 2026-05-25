import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  currentPage?: number | null;
  progressPct?: number | null;
  pageCount?: number | null;
}

export function ProgressBar({ currentPage, progressPct, pageCount }: ProgressBarProps) {
  const pct = progressPct ?? (currentPage && pageCount ? (currentPage / pageCount) * 100 : null);

  if (pct === null) return null;

  const display = Math.round(pct);

  return (
    <div className="space-y-1">
      <Progress value={display} className="h-1.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{display}%</span>
        {currentPage && pageCount && (
          <span>
            p. {currentPage} / {pageCount}
          </span>
        )}
      </div>
    </div>
  );
}
