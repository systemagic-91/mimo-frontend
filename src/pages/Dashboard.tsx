import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Briefcase, Clock3, PackageX } from "lucide-react";
import { useDb } from "@/lib/db";
import {
  consignmentViewStatus,
  getKpis,
  getOpenConsignments,
  getOverdueSellers,
  getSeller,
  getStageCounts,
} from "@/lib/domain";
import { CONSIGNMENT_STATUS_LABEL } from "@/lib/status";
import { formatCurrency, formatDate, formatRelativeDays } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { PieceTracker } from "@/components/piece-tracker";
import { StatusBadge } from "@/components/status-badge";
import { PieceCode } from "@/components/piece-code";
import { PieceDetailSheet } from "@/components/piece-detail-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const db = useDb();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const kpis = useMemo(() => getKpis(db), [db]);
  const counts = useMemo(() => getStageCounts(db), [db]);
  const openConsignments = useMemo(() => getOpenConsignments(db), [db]);
  const overdue = useMemo(() => getOverdueSellers(db), [db]);

  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Dashboard
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Peças ativas em consignação"
          value={kpis.activeInHand}
          sub={`${formatCurrency(kpis.activeInHandValue)} em posse das vendedoras`}
          icon={Briefcase}
          accent="gold"
        />
        <KpiCard
          label="Giro médio de peça"
          value={
            kpis.avgTurnoverDays !== null ? `${kpis.avgTurnoverDays} dias` : "—"
          }
          sub="Do etiquetamento à venda"
          icon={Clock3}
        />
        <KpiCard
          label="Estoque parado há +60 dias"
          value={kpis.staleCount}
          sub={`${formatCurrency(kpis.staleValue)} parados em estoque`}
          icon={PackageX}
          accent="late"
        />
        <KpiCard
          label="Vendedoras inadimplentes"
          value={kpis.overdueSellers}
          sub={
            overdue.length
              ? `${formatCurrency(overdue.reduce((s, o) => s + o.valueAtRisk, 0))} em risco`
              : "Todas em dia"
          }
          icon={AlertTriangle}
          accent="late"
        />
      </div>

      <PieceTracker
        counts={counts}
        onOpenPiece={(pieceId) => {
          setSelectedId(pieceId);
          setSheetOpen(true);
        }}
      />

      <section className="rounded-lg border bg-card shadow-none">
        <div className="border-b px-5 py-4">
          <h2 className="font-serif text-lg font-medium text-foreground">
            Consignações em aberto
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Lote</TableHead>
              <TableHead>Vendedora</TableHead>
              <TableHead className="text-right">Peças</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Devolução</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openConsignments.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma consignação em aberto.
                </TableCell>
              </TableRow>
            )}
            {openConsignments.map((c) => {
              const seller = getSeller(db, c.sellerId);
              const inHand = c.items.filter(
                (i) => i.status === "com_vendedora",
              );
              const status = consignmentViewStatus(c);
              const days = Math.round(
                (new Date(c.dueAt).getTime() - Date.now()) / 86_400_000,
              );
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/consignacao/${c.sellerId}`)}
                >
                  <TableCell>
                    <PieceCode code={c.code} />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {seller?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {inHand.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatCurrency(inHand.reduce((s, i) => s + i.value, 0))}
                  </TableCell>
                  <TableCell>
                    <span className="text-foreground">
                      {formatDate(c.dueAt)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatRelativeDays(days)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge
                      status={status}
                      label={CONSIGNMENT_STATUS_LABEL[status]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <PieceDetailSheet
        pieceId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
