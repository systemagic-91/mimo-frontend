import { useState } from "react";
import { Check, Search } from "lucide-react";
import { PaginationBar } from "@/components/pagination-bar";
import { PieceCode } from "@/components/piece-code";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePiecesQuery } from "@/lib/api/hooks";
import { centsToMoney } from "@/lib/api/mappers";
import type { PieceDto } from "@/lib/api/types";
import { formatCurrency } from "@/lib/format";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

/** Passo 1: escolher a peça que voltou do banho de ouro (a etiquetagem atualiza essa mesma peça). */
export function SourcePieceStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: PieceDto | null;
  onSelect: (piece: PieceDto) => void;
  onContinue: () => void;
}) {
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const pieces = usePiecesQuery({
    status: "banho_ouro",
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: ["code,asc"],
  });

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 shadow-none">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar peça no banho"
          placeholder="Buscar por código ou tipo"
          maxLength={120}
          className="pl-9"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {pieces.isPending ? (
        <RemoteQueryState state="loading" />
      ) : pieces.isError ? (
        <RemoteQueryState
          state="error"
          message={getPieceErrorMessage(pieces.error)}
          onRetry={() => void pieces.refetch()}
        />
      ) : pieces.data.items.length === 0 ? (
        <RemoteQueryState
          state="empty"
          message={q ? "Nenhuma peça no banho com essa busca." : "Nenhuma peça no banho de ouro agora."}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <ul aria-label="Peças no banho de ouro" className="divide-y">
            {pieces.data.items.map((piece) => {
              const active = selected?.id === piece.id;
              return (
                <li key={piece.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`${piece.code}, ${piece.type}`}
                    onClick={() => onSelect(piece)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                      active && "bg-gold/10",
                    )}
                  >
                    <span className="flex flex-col">
                      <PieceCode code={piece.code} />
                      <span className="text-xs text-muted-foreground">
                        {piece.type} · {formatCurrency(centsToMoney(piece.valueCents))}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 text-gold" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
          <PaginationBar
            pagination={pieces.data.pagination}
            onPageChange={setPage}
            disabled={pieces.isFetching}
          />
        </div>
      )}

      <Button className="h-12 w-full text-base" disabled={!selected} onClick={onContinue}>
        Continuar
      </Button>
    </section>
  );
}
