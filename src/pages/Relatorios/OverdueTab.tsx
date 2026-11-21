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
import { centsToMoney } from "@/lib/api/mappers";
import { centsToCsvDecimal, downloadCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import { getReportErrorMessage } from "@/lib/report-errors";
import { ExportButton } from "./ExportButton";

/** Vendedoras com lote vencido (`GET /reports/overdue`), do maior atraso para o menor. */
export function OverdueTab() {
  const report = useOverdueReportQuery();
  const rows = report.data?.items ?? [];

  const exportCsv = () =>
    downloadCsv(
      "inadimplencia.csv",
      ["Vendedora", "Telefone", "Lotes atrasados", "Pecas em posse", "Valor em risco", "Maior atraso (dias)"],
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
        <p className="text-sm text-muted-foreground">Vendedoras com consignações em aberto após o prazo</p>
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
          <RemoteQueryState state="empty" message="Nenhuma inadimplência. Todas as vendedoras estão em dia." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Vendedora</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Lotes atrasados</TableHead>
                  <TableHead className="text-right">Peças em posse</TableHead>
                  <TableHead className="text-right">Valor em risco</TableHead>
                  <TableHead className="text-right">Maior atraso</TableHead>
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
                      {formatCurrency(centsToMoney(row.valueAtRiskCents))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {row.maxOverdueDays} dia{row.maxOverdueDays === 1 ? "" : "s"}
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
