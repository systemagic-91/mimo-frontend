import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldError } from "@/components/field-error";
import { PieceCode } from "@/components/piece-code";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsOwner } from "@/hooks/use-is-owner";
import { useTurnoverReportQuery } from "@/lib/api/hooks";
import { centsToCsvDecimal, downloadCsv } from "@/lib/csv";
import { formatCents, formatDate } from "@/lib/format";
import { getReportErrorMessage } from "@/lib/report-errors";
import { addDaysToDate, countDaysInclusive, periodRange, todayInZone } from "@/lib/store-time";
import { ExportButton } from "./ExportButton";

/** Limite do backend para o período do giro. */
const MAX_PERIOD_DAYS = 366;

function shortcuts(timeZone: string) {
  const today = todayInZone(timeZone);
  return [
    { label: "reports.turnover.shortcut.currentMonth", range: periodRange("mes_atual", timeZone) },
    { label: "reports.turnover.shortcut.previousMonth", range: periodRange("mes_anterior", timeZone) },
    { label: "reports.turnover.shortcut.last90", range: { from: addDaysToDate(today, -89), to: today } },
  ];
}

const money = (cents: number | null) => (cents == null ? "—" : formatCents(cents));
const csvMoney = (cents: number | null) => (cents == null ? "" : centsToCsvDecimal(cents));

/**
 * Vendas do período (`GET /reports/turnover`), em datas locais da loja. Comissão, custo e margem vêm da API
 * (a margem só existe com os dois custos informados) e aparecem pelo papel de owner.
 */
export function TurnoverTab({ timeZone }: { timeZone: string }) {
  const { t } = useTranslation();
  const isOwner = useIsOwner();
  const [range, setRange] = useState(() => periodRange("mes_atual", timeZone));
  const { from, to } = range;
  const days = from && to ? countDaysInclusive(from, to) : 0;
  const periodError = !from || !to
    ? t("reports.turnover.missingDates")
    : days < 1
      ? t("reports.turnover.inverted")
      : days > MAX_PERIOD_DAYS
        ? t("reports.turnover.tooLong", { max: MAX_PERIOD_DAYS })
        : null;
  // Só consulta com o período válido.
  const report = useTurnoverReportQuery(from, to, periodError === null);
  const rows = report.data?.items ?? [];

  const exportCsv = () =>
    downloadCsv(
      `giro-de-pecas-${from}-a-${to}.csv`,
      [
        t("reports.csv.code"),
        t("reports.csv.type"),
        t("reports.csv.value"),
        t("reports.csv.soldAt"),
        t("reports.csv.seller"),
        t("reports.csv.daysToSell"),
        ...(isOwner ? [t("reports.csv.commission"), t("reports.csv.cost"), t("reports.csv.margin")] : []),
      ],
      rows.map((row) => [
        row.code,
        row.type,
        centsToCsvDecimal(row.valueCents),
        formatDate(row.soldAt, timeZone),
        row.sellerName,
        row.daysToSell,
        ...(isOwner
          ? [csvMoney(row.commissionCents), csvMoney(row.totalCostCents), csvMoney(row.marginCents)]
          : []),
      ]),
    );
  const summary = report.data?.summary;
  const withMargin = summary ? summary.soldCount - summary.piecesWithoutFullCost : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="g-from">{t("reports.turnover.from")}</Label>
              <Input
                id="g-from"
                type="date"
                value={from}
                onChange={(event) => setRange({ from: event.target.value, to })}
                aria-invalid={Boolean(periodError)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-to">{t("reports.turnover.to")}</Label>
              <Input
                id="g-to"
                type="date"
                value={to}
                onChange={(event) => setRange({ from, to: event.target.value })}
                aria-invalid={Boolean(periodError)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shortcuts(timeZone).map((shortcut) => (
                <Button
                  key={shortcut.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRange(shortcut.range)}
                >
                  {t(shortcut.label)}
                </Button>
              ))}
            </div>
          </div>
          <FieldError message={periodError ?? undefined} />
        </div>
        <ExportButton onClick={exportCsv} disabled={periodError !== null || rows.length === 0} />
      </div>

      {summary && periodError === null && (
        <div className="space-y-0.5 text-sm text-muted-foreground">
          <p>
            {t("reports.turnover.sales", { count: summary.soldCount })} ·{" "}
            {formatCents(summary.soldValueCents)}
          </p>
          {isOwner && summary.soldCount > 0 && (
            <p>
              {t("reports.turnover.margin")} <span className="font-medium text-foreground">{money(summary.marginCents)}</span>
              {summary.piecesWithoutFullCost > 0 &&
                t("reports.turnover.partialMargin", {
                  withMargin,
                  sales: t("reports.turnover.sales", { count: summary.soldCount }),
                  without: summary.piecesWithoutFullCost,
                })}
            </p>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border bg-card shadow-none">
        {periodError !== null ? (
          <RemoteQueryState state="empty" message={t("reports.turnover.fixPeriod")} />
        ) : report.isPending ? (
          <RemoteQueryState state="loading" />
        ) : report.isError ? (
          <RemoteQueryState
            state="error"
            message={getReportErrorMessage(report.error)}
            onRetry={() => void report.refetch()}
          />
        ) : rows.length === 0 ? (
          <RemoteQueryState state="empty" message={t("reports.turnover.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("reports.column.code")}</TableHead>
                  <TableHead>{t("reports.column.type")}</TableHead>
                  <TableHead className="text-right">{t("reports.column.value")}</TableHead>
                  <TableHead>{t("reports.turnover.soldAt")}</TableHead>
                  <TableHead>{t("reports.column.seller")}</TableHead>
                  <TableHead className="text-right">{t("reports.turnover.daysToSell")}</TableHead>
                  {isOwner && (
                    <>
                      <TableHead className="text-right">{t("reports.turnover.commission")}</TableHead>
                      <TableHead className="text-right">{t("reports.turnover.cost")}</TableHead>
                      <TableHead className="text-right">{t("reports.turnover.margin.column")}</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.code}-${row.soldAt}`} className="hover:bg-transparent">
                    <TableCell>
                      <PieceCode code={row.code} />
                    </TableCell>
                    <TableCell className="text-foreground">{row.type}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatCents(row.valueCents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.soldAt, timeZone)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.sellerName}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">{row.daysToSell}</TableCell>
                    {isOwner && (
                      <>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {money(row.commissionCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {money(row.totalCostCents)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${row.marginCents != null && row.marginCents < 0 ? "text-late" : "text-foreground"}`}
                        >
                          {money(row.marginCents)}
                        </TableCell>
                      </>
                    )}
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
