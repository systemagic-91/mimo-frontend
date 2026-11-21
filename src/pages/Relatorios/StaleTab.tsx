import { useState } from "react";
import { PieceCode } from "@/components/piece-code";
import { PieceDetailSheet } from "@/components/piece-detail-sheet";
import { RemoteQueryState } from "@/components/remote-query-state";
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
import { useStalePiecesReportQuery } from "@/lib/api/hooks";
import { centsToCsvDecimal, downloadCsv } from "@/lib/csv";
import { formatCents } from "@/lib/format";
import { getReportErrorMessage } from "@/lib/report-errors";
import { ExportButton } from "./ExportButton";

const DAY_OPTIONS = [30, 60, 90, 180, 365];

/** Peças etiquetadas paradas há pelo menos N dias (`GET /reports/stale-pieces`). */
export function StaleTab() {
  const [days, setDays] = useState(60);
  const report = useStalePiecesReportQuery(days);
  const rows = report.data?.items ?? [];
  const [pieceId, setPieceId] = useState<string | null>(null);

  const exportCsv = () =>
    downloadCsv(
      `pecas-paradas-${days}-dias.csv`,
      ["Codigo", "Tipo", "Valor", "Parada ha (dias)"],
      rows.map((row) => [row.code, row.type, centsToCsvDecimal(row.valueCents), row.daysStopped]),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Peças etiquetadas paradas em estoque há pelo menos
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger className="h-8 w-28" aria-label="Dias parados">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} dias
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExportButton onClick={exportCsv} disabled={rows.length === 0} />
      </div>

      {report.data && (
        <p className="text-sm text-muted-foreground">
          {report.data.summary.count} peça{report.data.summary.count === 1 ? "" : "s"} ·{" "}
          {formatCents(report.data.summary.valueCents)}
        </p>
      )}

      <section className="overflow-hidden rounded-lg border bg-card shadow-none">
        {report.isPending ? (
          <RemoteQueryState state="loading" />
        ) : report.isError ? (
          <RemoteQueryState
            state="error"
            message={getReportErrorMessage(report.error)}
            onRetry={() => void report.refetch()}
          />
        ) : rows.length === 0 ? (
          <RemoteQueryState state="empty" message={`Nenhuma peça parada há ${days} dias ou mais.`} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Parada há</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => setPieceId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setPieceId(row.id);
                    }}
                  >
                    <TableCell>
                      <PieceCode code={row.code} />
                    </TableCell>
                    <TableCell className="text-foreground">{row.type}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatCents(row.valueCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {row.daysStopped} dia{row.daysStopped === 1 ? "" : "s"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <PieceDetailSheet
        pieceId={pieceId}
        open={pieceId !== null}
        onOpenChange={(open) => !open && setPieceId(null)}
      />
    </div>
  );
}
