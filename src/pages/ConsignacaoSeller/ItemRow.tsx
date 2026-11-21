import { CalendarDays, Check, HandCoins, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import { fromBackendConsignmentItemStatus } from "@/lib/api/mappers";
import type { ConsignmentItemDto } from "@/lib/api/types";
import { formatCents, formatDate, formatLocalDate } from "@/lib/format";
import type { ItemAction } from "./ItemDateDialog";

/**
 * Uma peça do lote. Os botões registram no momento atual; "Com data" abre o registro retroativo.
 * O valor devido só aparece quando a API manda (owner); para staff ele vem `null`.
 */
export function ItemRow({
  item,
  timeZone,
  busy,
  onAction,
  onActionWithDate,
}: {
  item: ConsignmentItemDto;
  timeZone: string;
  /** Algum item do lote está sendo salvo. */
  busy: boolean;
  onAction: (action: ItemAction) => void;
  onActionWithDate: () => void;
}) {
  const { t } = useTranslation();
  const status = fromBackendConsignmentItemStatus(item.status);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <PieceCode code={item.codeSnapshot} />
        <span className="text-sm text-muted-foreground">
          {item.typeSnapshot} · {formatCents(item.valueCentsSnapshot)} ·{" "}
          {t("seller.item.commission", { rate: item.commissionRateSnapshot })}
        </span>
      </div>

      {status === "com_vendedora" && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => onAction("sold")} disabled={busy} aria-label={t("seller.item.soldLabel", { code: item.codeSnapshot })}>
            <Check className="h-3.5 w-3.5" />
            {t("seller.item.sold")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("returned")}
            disabled={busy}
            aria-label={t("seller.item.returnedLabel", { code: item.codeSnapshot })}
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t("seller.item.returned")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onActionWithDate}
            disabled={busy}
            aria-label={t("seller.item.withDateLabel", { code: item.codeSnapshot })}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {t("seller.item.withDate")}
          </Button>
        </div>
      )}

      {status === "vendida" && item.soldAt && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-success">
            <HandCoins className="h-3.5 w-3.5" />
            {t("seller.item.soldAt", { date: formatDate(item.soldAt, timeZone) })}
          </span>
          {item.paymentDueDate && (
            <span className="text-muted-foreground">
              {t("seller.item.paymentDue", { date: formatLocalDate(item.paymentDueDate) })}
              {item.amountDueCents != null &&
                t("seller.item.amountDue", { value: formatCents(item.amountDueCents) })}
            </span>
          )}
        </span>
      )}

      {status === "devolvida" && item.returnedAt && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Undo2 className="h-3.5 w-3.5" />
          {t("seller.item.returnedAt", { date: formatDate(item.returnedAt, timeZone) })}
        </span>
      )}
    </li>
  );
}
