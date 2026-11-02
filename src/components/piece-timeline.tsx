import { fromBackendPieceStage } from "@/lib/api/mappers";
import type { PieceEventDto } from "@/lib/api/types";
import { STAGE_LABEL } from "@/lib/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  fabrica: "bg-muted-foreground",
  banho_ouro: "bg-muted-foreground",
  etiquetada: "bg-gold",
  consignacao: "bg-gold",
  vendida: "bg-success",
  devolvida: "bg-muted-foreground",
};

/** Ordem crescente de `occurredAt`, com desempate por `id` (a mesma regra do backend). */
function sortPieceEvents(events: PieceEventDto[]): PieceEventDto[] {
  return [...events].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  );
}

export function PieceTimeline({ events }: { events: PieceEventDto[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem histórico.</p>;
  }
  return (
    <ol
      aria-label="Linha do tempo"
      className="relative ml-0.5 space-y-4 border-l border-border pl-4"
    >
      {sortPieceEvents(events).map((e) => {
        const stage = fromBackendPieceStage(e.stage);
        return (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background",
                DOT[stage] ?? "bg-muted-foreground",
              )}
            />
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {STAGE_LABEL[stage]}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDateTime(e.occurredAt)}
              </span>
            </div>
            {e.note && (
              <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
