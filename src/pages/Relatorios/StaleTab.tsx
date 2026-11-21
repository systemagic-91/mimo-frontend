import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [days, setDays] = useState(60);
  const report = useStalePiecesReportQuery(days);
  const rows = report.data?.items ?? [];
  const [pieceId, setPieceId] = useState<string | null>(null);

  const exportCsv = () =>
    downloadCsv(
      `pecas-paradas-${days}-dias.csv`,
      [t("reports.csv.code"), t("reports.csv.type"), t("reports.csv.value"), t("reports.csv.daysStopped")],
      rows.map((row) => [row.code, row.type, centsToCsvDecimal(row.valueCents), row.daysStopped]),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {t("reports.stale.subtitle")}
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger className="h-8 w-28" aria-label={t("reports.stale.daysLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t("common.days", { count: option })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExportButton onClick={exportCsv} disabled={rows.length === 0} />
      </div>

      {report.data && (
        <p className="text-sm text-muted-foreground">
          {t("common.pieces", { count: report.data.summary.count })} ·{" "}
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
          <RemoteQueryState state="empty" message={t("reports.stale.empty", { days })} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("reports.column.code")}</TableHead>
                  <TableHead>{t("reports.column.type")}</TableHead>
                  <TableHead className="text-right">{t("reports.column.value")}</TableHead>
                  <TableHead className="text-right">{t("reports.stale.stopped")}</TableHead>
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
                      {t("common.days", { count: row.daysStopped })}
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
