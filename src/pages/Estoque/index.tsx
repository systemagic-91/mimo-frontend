import { useState } from "react";
import { PackagePlus, Search } from "lucide-react";
import { PaginationBar } from "@/components/pagination-bar";
import { PieceCode } from "@/components/piece-code";
import { PieceDetailSheet } from "@/components/piece-detail-sheet";
import { RemoteQueryState } from "@/components/remote-query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePiecesQuery } from "@/lib/api/hooks";
import { centsToMoney, fromBackendPieceStage } from "@/lib/api/mappers";
import type { PieceListParams } from "@/lib/api/pieces";
import { formatCurrency, formatDate } from "@/lib/format";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import { PIECE_STAGES, STAGE_LABEL } from "@/lib/status";
import type { PieceStage } from "@/lib/types";
import { ReceivePieceDialog } from "./ReceivePieceDialog";
import { SortableHead, type SortField, type SortState } from "./SortableHead";

const PAGE_SIZE = 50;
const SEARCH_DELAY_MS = 300;

type StatusFilter = "todos" | PieceStage;

export default function Estoque() {
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [sort, setSort] = useState<SortState>({ field: "code", direction: "asc" });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const params: PieceListParams = {
    q: q || undefined,
    status: statusFilter === "todos" ? undefined : statusFilter,
    page,
    pageSize: PAGE_SIZE,
    // Desempate pelo código, para a paginação não repetir nem pular peças com o mesmo valor.
    sort:
      sort.field === "code"
        ? [`code,${sort.direction}`]
        : [`${sort.field},${sort.direction}`, "code,asc"],
  };
  const pieces = usePiecesQuery(params);
  const data = pieces.data;

  const handleSort = (field: SortField) => {
    setSort((current) =>
      current.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" },
    );
    setPage(1);
  };

  const openPiece = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Estoque
          </h1>
          {/* Quantidade e valor do filtro inteiro, vindos da API (não a soma da página). */}
          <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
            {data
              ? `${data.pagination.total} peça${data.pagination.total === 1 ? "" : "s"} · ${formatCurrency(centsToMoney(data.summary.totalValueCents))}`
              : "Carregando…"}
          </p>
        </div>
        <Button onClick={() => setReceiving(true)}>
          <PackagePlus className="h-4 w-4" />
          Receber peça
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar peças"
            placeholder="Buscar por código ou tipo"
            maxLength={120}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56" aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {PIECE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section
        className="overflow-hidden rounded-lg border bg-card shadow-none"
        aria-busy={pieces.isFetching}
      >
        {pieces.isPending ? (
          <RemoteQueryState state="loading" />
        ) : pieces.isError ? (
          <RemoteQueryState
            state="error"
            message={getPieceErrorMessage(pieces.error)}
            onRetry={() => void pieces.refetch()}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead field="code" label="Código" sort={sort} onSort={handleSort} />
                  <SortableHead field="type" label="Tipo" sort={sort} onSort={handleSort} />
                  <SortableHead
                    field="valueCents"
                    label="Valor"
                    sort={sort}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <TableHead className="hidden md:table-cell">Localização</TableHead>
                  <SortableHead field="status" label="Status" sort={sort} onSort={handleSort} />
                  <SortableHead
                    field="updatedAt"
                    label="Atualizado"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden text-right md:table-cell"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieces.data.items.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhuma peça encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {pieces.data.items.map((p) => {
                  const stage = fromBackendPieceStage(p.status);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => openPiece(p.id)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className="hover:underline"
                          aria-label={`Ver peça ${p.code}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openPiece(p.id);
                          }}
                        >
                          <PieceCode code={p.code} />
                        </button>
                      </TableCell>
                      <TableCell className="text-foreground">{p.type}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatCurrency(centsToMoney(p.valueCents))}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {p.currentLocation}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={stage} label={STAGE_LABEL[stage]} />
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                        {formatDate(p.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationBar
              pagination={pieces.data.pagination}
              onPageChange={setPage}
              disabled={pieces.isFetching}
            />
          </>
        )}
      </section>

      <PieceDetailSheet
        pieceId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {receiving && (
        <ReceivePieceDialog
          onClose={() => setReceiving(false)}
          onReceived={(piece) => {
            setReceiving(false);
            openPiece(piece.id);
          }}
        />
      )}
    </div>
  );
}
