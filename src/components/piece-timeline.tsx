import { STAGE_LABEL } from "@/lib/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PieceEvent } from "@/lib/types";

const DOT: Record<string, string> = {
  fabrica: "bg-muted-foreground",
  banho_ouro: "bg-muted-foreground",
  etiquetada: "bg-gold",
  consignacao: "bg-gold",
  vendida: "bg-success",
  devolvida: "bg-muted-foreground",
};

export function PieceTimeline({ events }: { events: PieceEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem histórico.</p>;
  }
  return (
    <ol className="relative ml-0.5 space-y-4 border-l border-border pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={cn(
              "absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background",
              DOT[e.stage] ?? "bg-muted-foreground",
            )}
          />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {STAGE_LABEL[e.stage]}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateTime(e.occurredAt)}
            </span>
          </div>
          {e.note && (
            <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
