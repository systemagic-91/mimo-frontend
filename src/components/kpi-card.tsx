import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ACCENTS = {
  default: "text-muted-foreground",
  gold: "text-gold",
  rose: "text-rose",
  success: "text-success",
  late: "text-late",
} as const;

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted",
          )}
        >
          <Icon className={cn("h-4 w-4", ACCENTS[accent])} />
        </span>
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
