import { useTranslation } from "react-i18next";
import { RemoteQueryState } from "@/components/remote-query-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOverdueReportQuery } from "@/lib/api/hooks";
import { centsToCsvDecimal, downloadCsv } from "@/lib/csv";
import { formatCents } from "@/lib/format";
import { getReportErrorMessage } from "@/lib/report-errors";
import { ExportButton } from "./ExportButton";

/** Vendedoras com lote vencido (`GET /reports/overdue`), do maior atraso para o menor. */
export function OverdueTab() {
  const { t } = useTranslation();
  const report = useOverdueReportQuery();
  const rows = report.data?.items ?? [];

  const exportCsv = () =>
    downloadCsv(
      "inadimplencia.csv",
      [
        t("reports.csv.seller"),
        t("reports.csv.phone"),
        t("reports.csv.lateLots"),
        t("reports.csv.piecesInHand"),
        t("reports.csv.valueAtRisk"),
        t("reports.csv.maxOverdue"),
      ],
      rows.map((row) => [
        row.sellerName,
        row.phone,
        row.lateLots,
        row.piecesInHand,
        centsToCsvDecimal(row.valueAtRiskCents),
        row.maxOverdueDays,
      ]),
    );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("reports.overdue.subtitle")}</p>
        <ExportButton onClick={exportCsv} disabled={rows.length === 0} />
      </div>
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
          <RemoteQueryState state="empty" message={t("reports.overdue.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("reports.column.seller")}</TableHead>
                  <TableHead>{t("reports.column.phone")}</TableHead>
                  <TableHead className="text-right">{t("reports.overdue.lateLots")}</TableHead>
                  <TableHead className="text-right">{t("reports.overdue.piecesInHand")}</TableHead>
                  <TableHead className="text-right">{t("reports.overdue.valueAtRisk")}</TableHead>
                  <TableHead className="text-right">{t("reports.overdue.maxOverdue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.sellerId} className="hover:bg-transparent">
                    <TableCell className="font-medium text-foreground">{row.sellerName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.phone}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.lateLots}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.piecesInHand}</TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {formatCents(row.valueAtRiskCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {t("common.days", { count: row.maxOverdueDays })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
