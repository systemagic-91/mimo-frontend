import { CalendarDays, Check, HandCoins, Undo2 } from "lucide-react";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import { centsToMoney, fromBackendConsignmentItemStatus } from "@/lib/api/mappers";
import type { ConsignmentItemDto } from "@/lib/api/types";
import { formatCurrency } from "@/lib/format";
import { formatDateInZone, formatLocalDate } from "@/lib/store-time";
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
  const status = fromBackendConsignmentItemStatus(item.status);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <PieceCode code={item.codeSnapshot} />
        <span className="text-sm text-muted-foreground">
          {item.typeSnapshot} · {formatCurrency(centsToMoney(item.valueCentsSnapshot))} · comissão{" "}
          {item.commissionRateSnapshot}%
        </span>
      </div>

      {status === "com_vendedora" && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => onAction("sold")} disabled={busy} aria-label={`Vendida ${item.codeSnapshot}`}>
            <Check className="h-3.5 w-3.5" />
            Vendida
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("returned")}
            disabled={busy}
            aria-label={`Devolvida ${item.codeSnapshot}`}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Devolvida
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onActionWithDate}
            disabled={busy}
            aria-label={`Registrar ${item.codeSnapshot} com data`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Com data
          </Button>
        </div>
      )}

      {status === "vendida" && item.soldAt && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-success">
            <HandCoins className="h-3.5 w-3.5" />
            Vendida em {formatDateInZone(item.soldAt, timeZone)}
          </span>
          {item.paymentDueDate && (
            <span className="text-muted-foreground">
              Pagamento até {formatLocalDate(item.paymentDueDate)}
              {item.amountDueCents != null &&
                ` · repassar ${formatCurrency(centsToMoney(item.amountDueCents))}`}
            </span>
          )}
        </span>
      )}

      {status === "devolvida" && item.returnedAt && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Undo2 className="h-3.5 w-3.5" />
          Devolvida em {formatDateInZone(item.returnedAt, timeZone)}
        </span>
      )}
    </li>
  );
}
