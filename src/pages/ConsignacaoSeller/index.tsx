import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { RemoteQueryState } from "@/components/remote-query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useIsOwner } from "@/hooks/use-is-owner";
import { useStoreTimezone } from "@/hooks/use-store-timezone";
import { ApiError } from "@/lib/api/http";
import { useSellerQuery } from "@/lib/api/hooks";
import { fromBackendSellerStatus } from "@/lib/api/mappers";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { SELLER_STATUS_LABEL } from "@/lib/status";
import { CommissionCard } from "./CommissionCard";
import { LotsHistory } from "./LotsHistory";
import { SellerStatsCards } from "./SellerStatsCards";

/**
 * Página da vendedora. Staff vê o histórico e registra vendas e devoluções; números, comissão e agenda de
 * repasses são só do owner, e para staff essas chamadas nem são feitas.
 */
export default function ConsignacaoSeller() {
  const { sellerId = "" } = useParams();
  const timeZone = useStoreTimezone();
  const isOwner = useIsOwner();
  const seller = useSellerQuery(sellerId);

  const back = (
    <Link
      to="/consignacao"
      className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Consignação
    </Link>
  );

  if (seller.isPending) return <RemoteQueryState state="loading" />;
  if (seller.isError) {
    if (seller.error instanceof ApiError && seller.error.code === "SELLER_NOT_FOUND") {
      return (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Vendedora não encontrada.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/consignacao">Voltar para consignação</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        {back}
        <RemoteQueryState
          state="error"
          message={getConsignmentErrorMessage(seller.error)}
          onRetry={() => void seller.refetch()}
        />
      </div>
    );
  }

  const status = fromBackendSellerStatus(seller.data.status);
  return (
    <div className="space-y-5">
      {back}

      <section className="no-print rounded-lg border bg-card p-5 shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 font-serif text-xl text-gold">
              {seller.data.name.charAt(0)}
            </span>
            <div>
              <h1 className="font-serif text-2xl font-medium text-foreground">{seller.data.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{seller.data.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-gold/30 bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
              Comissão {seller.data.commissionRate}%
            </span>
            <StatusBadge status={status} label={SELLER_STATUS_LABEL[status]} />
          </div>
        </div>
        {isOwner && <SellerStatsCards sellerId={sellerId} />}
      </section>

      {isOwner && (
        <div className="no-print">
          <CommissionCard sellerId={sellerId} />
        </div>
      )}

      <LotsHistory sellerId={sellerId} timeZone={timeZone} />
    </div>
  );
}
