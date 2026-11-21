import { useState } from "react";
import { PackagePlus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { useStoreTimezone } from "@/hooks/use-store-timezone";
import { usePiecesQuery } from "@/lib/api/hooks";
import { fromBackendPieceStage } from "@/lib/api/mappers";
import type { PieceListParams } from "@/lib/api/pieces";
import { formatCents, formatDate } from "@/lib/format";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import { PIECE_STAGES, STAGE_LABEL } from "@/lib/status";
import type { PieceStage } from "@/lib/api/types";
import { ReceivePieceDialog } from "./ReceivePieceDialog";
import { SortableHead, type SortField, type SortState } from "./SortableHead";

const PAGE_SIZE = 50;
const SEARCH_DELAY_MS = 300;

type StatusFilter = "todos" | PieceStage;

export default function Estoque() {
  const { t } = useTranslation();
  const timeZone = useStoreTimezone();
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
            {t("stock.title")}
          </h1>
          {/* Quantidade e valor do filtro inteiro, vindos da API (não a soma da página). */}
          <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
            {data
              ? t("stock.summary", {
                  pieces: t("common.pieces", { count: data.pagination.total }),
                  value: formatCents(data.summary.totalValueCents),
                })
              : t("common.loading")}
          </p>
        </div>
        <Button onClick={() => setReceiving(true)}>
          <PackagePlus className="h-4 w-4" />
          {t("stock.receive")}
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("stock.search")}
            placeholder={t("common.searchCodeOrType")}
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
          <SelectTrigger className="sm:w-56" aria-label={t("stock.filterStatus")}>
            <SelectValue placeholder={t("stock.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">{t("stock.allStatuses")}</SelectItem>
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
                  <SortableHead field="code" label={t("stock.column.code")} sort={sort} onSort={handleSort} />
                  <SortableHead field="type" label={t("stock.column.type")} sort={sort} onSort={handleSort} />
                  <SortableHead
                    field="valueCents"
                    label={t("stock.column.value")}
                    sort={sort}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <TableHead className="hidden md:table-cell">{t("stock.column.location")}</TableHead>
                  <SortableHead field="status" label={t("stock.column.status")} sort={sort} onSort={handleSort} />
                  <SortableHead
                    field="updatedAt"
                    label={t("stock.column.updatedAt")}
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
                      {t("stock.empty")}
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
                          aria-label={t("stock.viewPiece", { code: p.code })}
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
                        {formatCents(p.valueCents)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {p.currentLocation}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={stage} label={STAGE_LABEL[stage]} />
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                        {formatDate(p.updatedAt, timeZone)}
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
