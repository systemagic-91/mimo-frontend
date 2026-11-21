import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PaginationBar } from "@/components/pagination-bar";
import { PieceCode } from "@/components/piece-code";
import { RemoteQueryState } from "@/components/remote-query-state";
import { StatusBadge } from "@/components/status-badge";
import { useConsignmentsQuery } from "@/lib/api/hooks";
import { centsToMoney } from "@/lib/api/mappers";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { formatCurrency, formatRelativeDays } from "@/lib/format";
import { CONSIGNMENT_STATUS_LABEL } from "@/lib/status";
import { formatDateInZone } from "@/lib/store-time";
import { cn } from "@/lib/utils";
import { LotDetails } from "./LotDetails";

const PAGE_SIZE = 20;

/**
 * Histórico de lotes da vendedora, do mais recente para o mais antigo. Usa `GET /consignments?sellerId=`
 * porque essa lista já traz o status visual (em dia, atrasado, quitado), os dias até o vencimento e o que
 * ainda está com a vendedora; o histórico de `/sellers/{id}/consignments` não traz o atraso.
 */
export function LotsHistory({ sellerId, timeZone }: { sellerId: string; timeZone: string }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const lots = useConsignmentsQuery({
    sellerId,
    page,
    pageSize: PAGE_SIZE,
    sort: ["deliveredAt,desc"],
  });

  return (
    <section className="no-print rounded-lg border bg-card shadow-none">
      <div className="border-b px-5 py-4">
        <h2 className="font-serif text-lg font-medium text-foreground">Histórico de lotes</h2>
      </div>

      {lots.isPending ? (
        <RemoteQueryState state="loading" />
      ) : lots.isError ? (
        <RemoteQueryState
          state="error"
          message={getConsignmentErrorMessage(lots.error)}
          onRetry={() => void lots.refetch()}
        />
      ) : lots.data.items.length === 0 ? (
        <RemoteQueryState state="empty" message="Nenhum lote entregue para esta vendedora." />
      ) : (
        <ul className="divide-y divide-border">
          {lots.data.items.map((lot) => {
            const isOpen = expanded === lot.id;
            return (
              <li key={lot.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : lot.id)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PieceCode code={lot.code} />
                      <span className="text-sm text-muted-foreground">
                        Entregue em {formatDateInZone(lot.deliveredAt, timeZone)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · Devolução{" "}
                        <span className="text-foreground">{formatDateInZone(lot.dueAt, timeZone)}</span>
                        {lot.status !== "quitada" && (
                          <span className="ml-1 text-xs">{formatRelativeDays(lot.dueInDays)}</span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lot.piecesInHand} peça{lot.piecesInHand === 1 ? "" : "s"} com a vendedora ·{" "}
                      {formatCurrency(centsToMoney(lot.valueInHandCents))} · pagamento{" "}
                      {lot.paymentTermDays ? `em ${lot.paymentTermDays} dias` : "com prazo não informado"}
                    </p>
                  </div>
                  <StatusBadge status={lot.status} label={CONSIGNMENT_STATUS_LABEL[lot.status]} />
                </button>
                {isOpen && <LotDetails consignmentId={lot.id} timeZone={timeZone} />}
              </li>
            );
          })}
        </ul>
      )}

      <PaginationBar pagination={lots.data?.pagination} onPageChange={setPage} />
    </section>
  );
}
