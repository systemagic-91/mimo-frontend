import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RemoteQueryState } from "@/components/remote-query-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useStoreTimezone } from "@/hooks/use-store-timezone";
import { useSellerCommissionQuery, useSellerPaymentScheduleQuery } from "@/lib/api/hooks";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { formatCents, formatLocalDate } from "@/lib/format";
import { type CommissionPeriod, periodRange } from "@/lib/store-time";

const PERIODS: { value: CommissionPeriod; label: string }[] = [
  { value: "mes_atual", label: "seller.commission.mes_atual" },
  { value: "mes_anterior", label: "seller.commission.mes_anterior" },
  { value: "historico", label: "seller.commission.historico" },
];

/**
 * Comissão e agenda de repasses do período (só owner). Os dois vêm da API, pela data da venda e com a
 * comissão guardada em cada item; nada é calculado aqui.
 */
export function CommissionCard({ sellerId }: { sellerId: string }) {
  const { t } = useTranslation();
  const timeZone = useStoreTimezone();
  const [period, setPeriod] = useState<CommissionPeriod>("mes_atual");
  const { from, to } = periodRange(period, timeZone);
  const commission = useSellerCommissionQuery(sellerId, from, to);
  const schedule = useSellerPaymentScheduleQuery(sellerId, from, to);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-medium text-foreground">{t("seller.commission.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("seller.commission.period", { from: formatLocalDate(from), to: formatLocalDate(to) })}
          </p>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as CommissionPeriod)}>
          <SelectTrigger className="w-44" aria-label={t("seller.commission.periodLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {commission.isPending ? (
        <RemoteQueryState state="loading" />
      ) : commission.isError ? (
        <RemoteQueryState
          state="error"
          message={getConsignmentErrorMessage(commission.error)}
          onRetry={() => void commission.refetch()}
        />
      ) : (
        <dl className="mt-4 flex flex-wrap items-center gap-6">
          <div>
            <dt className="text-xs text-muted-foreground">{t("seller.commission.sales")}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {commission.data.soldCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("seller.commission.soldValue")}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {formatCents(commission.data.soldValueCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("seller.commission.sellerCommission")}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-gold">
              {formatCents(commission.data.commissionCents)}
            </dd>
          </div>
        </dl>
      )}

      <Separator className="my-4" />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {t("seller.schedule.title")}
      </div>
      {schedule.isPending ? (
        <RemoteQueryState state="loading" />
      ) : schedule.isError ? (
        <RemoteQueryState
          state="error"
          message={getConsignmentErrorMessage(schedule.error)}
          onRetry={() => void schedule.refetch()}
        />
      ) : schedule.data.groups.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("seller.schedule.empty")}</p>
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t("seller.schedule.label")}>
            {schedule.data.groups.map((group) => (
              <li
                key={group.paymentTermDays ?? "sem-prazo"}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {group.paymentTermDays
                      ? t("common.days", { count: group.paymentTermDays })
                      : t("seller.schedule.noTerm")}{" "}
                    · {t("seller.schedule.sales", { count: group.soldCount })}
                  </p>
                  <p className="text-base font-semibold tabular-nums text-foreground">
                    {formatCents(group.amountDueCents)}
                  </p>
                </div>
                {group.firstDueDate && group.lastDueDate && (
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">{t("seller.schedule.due")}</p>
                    <p className="text-xs text-foreground">
                      {group.firstDueDate === group.lastDueDate
                        ? formatLocalDate(group.firstDueDate)
                        : t("seller.schedule.dueRange", {
                            from: formatLocalDate(group.firstDueDate),
                            to: formatLocalDate(group.lastDueDate),
                          })}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right text-sm text-muted-foreground">
            {t("seller.schedule.total")}{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCents(schedule.data.totalDueCents)}
            </span>
          </p>
        </>
      )}
    </section>
  );
}
