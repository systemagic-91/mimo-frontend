import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PaginationBar } from "@/components/pagination-bar";
import { PieceCode } from "@/components/piece-code";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePiecesQuery } from "@/lib/api/hooks";
import type { PieceDto } from "@/lib/api/types";
import { formatCents } from "@/lib/format";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
/** Limite do backend por lote. */
export const MAX_PIECES_PER_LOT = 200;

/**
 * Passo 2: peças etiquetadas, com busca e paginação na API. A seleção fica guardada por UUID com os dados
 * da peça, então sobrevive à troca de página e de busca.
 */
export function PiecesStep({
  selected,
  onToggle,
}: {
  selected: Map<string, PieceDto>;
  onToggle: (piece: PieceDto) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const pieces = usePiecesQuery({
    status: "etiquetada",
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: ["code,asc"],
  });
  const selectedPieces = [...selected.values()];
  const totalCents = selectedPieces.reduce((sum, piece) => sum + piece.valueCents, 0);
  const full = selected.size >= MAX_PIECES_PER_LOT;

  return (
    <section className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={t("stock.search")}
          placeholder={t("common.searchCodeOrType")}
          className="pl-9"
          maxLength={120}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-none">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {pieces.data
              ? t("wizard.piecesCount", { count: pieces.data.pagination.total })
              : t("wizard.piecesLabel")}
          </span>
          <span className="text-sm font-medium text-foreground">
            {t("wizard.selected", { count: selected.size })}
          </span>
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
            message={q ? t("wizard.piecesEmptySearch") : t("wizard.piecesEmpty")}
          />
        ) : (
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {pieces.data.items.map((piece) => {
              const checked = selected.has(piece.id);
              return (
                <button
                  key={piece.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`${piece.code} ${piece.type}`}
                  disabled={!checked && full}
                  onClick={() => onToggle(piece)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50",
                    checked ? "bg-gold/5" : "hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      checked ? "border-gold bg-gold text-primary-foreground" : "border-border",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <PieceCode code={piece.code} />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{piece.type}</span>
                  <span className="text-sm tabular-nums text-foreground">
                    {formatCents(piece.valueCents)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <PaginationBar pagination={pieces.data?.pagination} onPageChange={setPage} />
      </div>

      {full && (
        <p className="text-sm text-muted-foreground">
          {t("wizard.maxPieces", { max: MAX_PIECES_PER_LOT })}
        </p>
      )}

      {selected.size > 0 && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("wizard.selectedTotal", { pieces: t("common.pieces", { count: selected.size }) })}
            </span>
            <span className="font-semibold tabular-nums text-gold">
              {formatCents(totalCents)}
            </span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("wizard.selectedList")}>
            {selectedPieces.map((piece) => (
              <li key={piece.id}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2"
                  onClick={() => onToggle(piece)}
                  aria-label={t("wizard.removePiece", { code: piece.code })}
                >
                  <span className="font-mono text-xs">{piece.code}</span>
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
