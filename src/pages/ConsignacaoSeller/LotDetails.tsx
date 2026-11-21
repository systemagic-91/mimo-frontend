import { useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { ConsignmentReceipt } from "@/components/consignment-receipt";
import { RemoteQueryState } from "@/components/remote-query-state";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";
import {
  useConsignmentQuery,
  useMarkItemReturnedMutation,
  useMarkItemSoldMutation,
} from "@/lib/api/hooks";
import type { ConsignmentItemDto } from "@/lib/api/types";
import {
  getConsignmentErrorMessage,
  getConsignmentFieldErrors,
} from "@/lib/consignment-errors";
import { dateInZone, todayInZone } from "@/lib/store-time";
import { type ItemAction, ItemDateDialog } from "./ItemDateDialog";
import { ItemRow } from "./ItemRow";

/** Itens do lote, carregados ao expandir (`GET /consignments/{id}`), com venda e devolução. */
export function LotDetails({ consignmentId, timeZone }: { consignmentId: string; timeZone: string }) {
  const lot = useConsignmentQuery(consignmentId);
  const markSold = useMarkItemSoldMutation();
  const markReturned = useMarkItemReturnedMutation();
  const [datedItem, setDatedItem] = useState<ConsignmentItemDto | null>(null);
  const [dateError, setDateError] = useState<string | undefined>();
  const busy = markSold.isPending || markReturned.isPending;

  if (lot.isPending) return <RemoteQueryState state="loading" />;
  if (lot.isError) {
    return (
      <RemoteQueryState
        state="error"
        message={getConsignmentErrorMessage(lot.error)}
        onRetry={() => void lot.refetch()}
      />
    );
  }

  const run = (item: ConsignmentItemDto, action: ItemAction, at?: string) => {
    if (busy) return;
    const mutation = action === "sold" ? markSold : markReturned;
    mutation.mutate(
      { consignmentId, pieceId: item.pieceId, at },
      {
        onSuccess: () => {
          setDatedItem(null);
          setDateError(undefined);
          toast.success(action === "sold" ? "Venda registrada" : "Devolução registrada", {
            description:
              action === "sold"
                ? `${item.codeSnapshot} marcada como vendida.`
                : `${item.codeSnapshot} voltou para o estoque.`,
          });
        },
        onError: (cause) => {
          const fields = getConsignmentFieldErrors(cause);
          const fieldError = fields.soldAt ?? fields.returnedAt;
          if (fieldError && datedItem) {
            setDateError(fieldError);
            return;
          }
          setDatedItem(null);
          if (cause instanceof ApiError && cause.code === "ITEM_NOT_WITH_SELLER") {
            // Outra pessoa registrou antes: avisa e recarrega o lote.
            toast.warning(getConsignmentErrorMessage(cause));
            void lot.refetch();
            return;
          }
          toast.error(getConsignmentErrorMessage(cause));
        },
      },
    );
  };

  const details = lot.data;
  return (
    <div className="space-y-2 px-5 pb-4 pl-11">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Prazo de pagamento:{" "}
          <span className="text-foreground">
            {details.paymentTermDays ? `${details.paymentTermDays} dias` : "não informado"}
          </span>
          {details.note && ` · ${details.note}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />
          Imprimir romaneio
        </Button>
      </div>
      <ul className="space-y-1.5" aria-label={`Peças do lote ${details.code}`}>
        {details.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            timeZone={timeZone}
            busy={busy}
            onAction={(action) => run(item, action)}
            onActionWithDate={() => {
              setDateError(undefined);
              setDatedItem(item);
            }}
          />
        ))}
      </ul>

      {datedItem && (
        <ItemDateDialog
          code={datedItem.codeSnapshot}
          minDate={dateInZone(details.deliveredAt, timeZone)}
          today={todayInZone(timeZone)}
          timeZone={timeZone}
          pending={busy}
          error={dateError}
          onConfirm={(action, at) => run(datedItem, action, at)}
          onClose={() => setDatedItem(null)}
        />
      )}
      {/* No body, fora do histórico (que some na impressão): só o romaneio sai no papel. */}
      {createPortal(<ConsignmentReceipt consignment={details} timeZone={timeZone} />, document.body)}
    </div>
  );
}
