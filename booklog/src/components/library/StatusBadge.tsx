import { Badge } from "@/components/ui/badge";
import { READING_STATUS_LABELS, type ReadingStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<ReadingStatus, string> = {
  CURRENTLY_READING: "bg-blue-100 text-blue-800 border-blue-200",
  FINISHED: "bg-green-100 text-green-800 border-green-200",
  WANT_TO_READ: "bg-purple-100 text-purple-800 border-purple-200",
  DNF: "bg-red-100 text-red-800 border-red-200",
  RE_READING: "bg-orange-100 text-orange-800 border-orange-200",
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return (
    <Badge className={cn("font-normal border", STATUS_COLORS[status])}>
      {READING_STATUS_LABELS[status]}
    </Badge>
  );
}
