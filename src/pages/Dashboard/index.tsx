import { useState } from "react";
import { AlertTriangle, Briefcase, Clock3, PackageX } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PieceDetailSheet } from "@/components/piece-detail-sheet";
import { PieceTracker } from "@/components/piece-tracker";
import { RemoteQueryState } from "@/components/remote-query-state";
import { useIsOwner } from "@/hooks/use-is-owner";
import { useStoreTimezone } from "@/hooks/use-store-timezone";
import { useDashboardQuery } from "@/lib/api/hooks";
import { formatCents, formatLongDate } from "@/lib/format";
import { getReportErrorMessage } from "@/lib/report-errors";
import { OpenConsignmentsTable } from "./OpenConsignmentsTable";

/** Dashboard do owner: uma só chamada a `GET /dashboard`, sem contas no navegador. */
export default function Dashboard() {
  const timeZone = useStoreTimezone();
  // Só owner chega aqui (HomeRedirect), mas a consulta também não dispara para staff.
  const isOwner = useIsOwner();
  const dashboard = useDashboardQuery(isOwner);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const todayLabel = formatLongDate(new Date(), timeZone);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
      </header>

      {dashboard.isPending ? (
        <RemoteQueryState state="loading" />
      ) : dashboard.isError ? (
        <RemoteQueryState
          state="error"
          message={getReportErrorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Peças ativas em consignação"
              value={dashboard.data.kpis.activeInHand}
              sub={`${formatCents(dashboard.data.kpis.activeInHandValueCents)} em posse das vendedoras`}
              icon={Briefcase}
              accent="gold"
            />
            <KpiCard
              label="Giro médio de peça"
              value={
                dashboard.data.kpis.avgTurnoverDays !== null
                  ? `${dashboard.data.kpis.avgTurnoverDays} dias`
                  : "—"
              }
              sub="Da etiquetagem à venda, vendas dos últimos 90 dias"
              icon={Clock3}
            />
            <KpiCard
              label="Estoque parado há +60 dias"
              value={dashboard.data.kpis.staleCount}
              sub={`${formatCents(dashboard.data.kpis.staleValueCents)} parados em estoque`}
              icon={PackageX}
              accent="late"
            />
            <KpiCard
              label="Vendedoras inadimplentes"
              value={dashboard.data.kpis.overdueSellers}
              sub={
                dashboard.data.overdueSellers.length
                  ? `${formatCents(
                      dashboard.data.overdueSellers.reduce((sum, row) => sum + row.valueAtRiskCents, 0),
                    )} em risco`
                  : "Todas em dia"
              }
              icon={AlertTriangle}
              accent="late"
            />
          </div>

          <PieceTracker
            counts={dashboard.data.stageCounts}
            onOpenPiece={(pieceId) => {
              setSelectedId(pieceId);
              setSheetOpen(true);
            }}
          />

          <OpenConsignmentsTable consignments={dashboard.data.openConsignments} timeZone={timeZone} />
        </>
      )}

      <PieceDetailSheet pieceId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
