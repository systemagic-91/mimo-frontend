import { useState } from "react";
import { AlertTriangle, Briefcase, Clock3, PackageX } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        <h1 className="font-serif text-2xl font-medium text-foreground">{t("dashboard.title")}</h1>
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
              label={t("dashboard.kpi.inHand")}
              value={dashboard.data.kpis.activeInHand}
              sub={t("dashboard.kpi.inHandSub", { value: formatCents(dashboard.data.kpis.activeInHandValueCents) })}
              icon={Briefcase}
              accent="gold"
            />
            <KpiCard
              label={t("dashboard.kpi.turnover")}
              value={
                dashboard.data.kpis.avgTurnoverDays !== null
                  ? t("common.days", { count: dashboard.data.kpis.avgTurnoverDays })
                  : "—"
              }
              sub={t("dashboard.kpi.turnoverSub")}
              icon={Clock3}
            />
            <KpiCard
              label={t("dashboard.kpi.stale")}
              value={dashboard.data.kpis.staleCount}
              sub={t("dashboard.kpi.staleSub", { value: formatCents(dashboard.data.kpis.staleValueCents) })}
              icon={PackageX}
              accent="late"
            />
            <KpiCard
              label={t("dashboard.kpi.overdue")}
              value={dashboard.data.kpis.overdueSellers}
              sub={
                dashboard.data.overdueSellers.length
                  ? t("dashboard.kpi.overdueSub", {
                      value: formatCents(
                        dashboard.data.overdueSellers.reduce((sum, row) => sum + row.valueAtRiskCents, 0),
                      ),
                    })
                  : t("dashboard.kpi.overdueNone")
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
