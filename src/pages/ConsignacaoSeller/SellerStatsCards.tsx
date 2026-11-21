import { RemoteQueryState } from "@/components/remote-query-state";
import { useSellerStatsQuery } from "@/lib/api/hooks";
import { getConsignmentErrorMessage } from "@/lib/consignment-errors";
import { formatCents } from "@/lib/format";

/** Números da vendedora (só owner): vêm prontos de `GET /sellers/{id}/stats`. */
export function SellerStatsCards({ sellerId }: { sellerId: string }) {
  const stats = useSellerStatsQuery(sellerId);

  if (stats.isPending) return <RemoteQueryState state="loading" />;
  if (stats.isError) {
    return (
      <RemoteQueryState
        state="error"
        message={getConsignmentErrorMessage(stats.error)}
        onRetry={() => void stats.refetch()}
      />
    );
  }

  const cards = [
    { label: "Peças em posse", value: String(stats.data.inHand) },
    { label: "Valor em posse", value: formatCents(stats.data.inHandValueCents) },
    { label: "Total vendido", value: formatCents(stats.data.totalSoldValueCents) },
    {
      label: "Comissão total",
      value: formatCents(stats.data.totalCommissionCents),
      gold: true,
    },
  ];
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${card.gold ? "text-gold" : "text-foreground"}`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
