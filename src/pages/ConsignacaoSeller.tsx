import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  HandCoins,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/lib/db";
import {
  consignmentViewStatus,
  getConsignmentsForSeller,
  getSeller,
  getSellerCommission,
  getSellerStats,
  markItemReturned,
  markItemSold,
} from "@/lib/domain";
import { CONSIGNMENT_STATUS_LABEL, SELLER_STATUS_LABEL } from "@/lib/status";
import {
  addDays,
  formatCurrency,
  formatDate,
  formatRelativeDays,
} from "@/lib/format";
import { PieceCode } from "@/components/piece-code";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "historico", label: "Todo o histórico" },
];

function periodRange(value: string): { from: string; to: string } {
  const now = new Date();
  const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1, 0);
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0);
  if (value === "mes_anterior")
    return { from: startPrev.toISOString(), to: startCurrent.toISOString() };
  if (value === "historico")
    return { from: new Date(2020, 0, 1).toISOString(), to: now.toISOString() };
  return { from: startCurrent.toISOString(), to: now.toISOString() };
}

export default function ConsignacaoSeller() {
  const { sellerId = "" } = useParams();
  const db = useDb();
  const seller = getSeller(db, sellerId);
  const [period, setPeriod] = useState("mes_atual");
  const [expanded, setExpanded] = useState<string | null>(null);

  const consignments = useMemo(
    () => getConsignmentsForSeller(db, sellerId),
    [db, sellerId],
  );
  const stats = useMemo(() => getSellerStats(db, sellerId), [db, sellerId]);
  const { from, to } = periodRange(period);
  const commission = useMemo(
    () => getSellerCommission(db, sellerId, from, to),
    [db, sellerId, from, to],
  );

  const soldInPeriod = useMemo(
    () =>
      consignments
        .flatMap((c) =>
          c.items.filter((i) => i.status === "vendida" && i.soldAt),
        )
        .filter((i) => {
          const t = new Date(i.soldAt!).getTime();
          return t >= new Date(from).getTime() && t <= new Date(to).getTime();
        }),
    [consignments, from, to],
  );

  if (!seller) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Vendedora não encontrada.</p>
        <Link to="/consignacao" className="mt-4 inline-block">
          <Button variant="outline">Voltar para consignação</Button>
        </Link>
      </div>
    );
  }

  const handleSold = (consignmentId: string, pieceId: string, code: string) => {
    markItemSold(consignmentId, pieceId);
    toast.success("Venda registrada", {
      description: `${code} marcada como vendida.`,
    });
  };

  const handleReturned = (
    consignmentId: string,
    pieceId: string,
    code: string,
  ) => {
    markItemReturned(consignmentId, pieceId);
    toast.success("Devolução registrada", {
      description: `${code} voltou para o estoque.`,
    });
  };

  return (
    <div className="space-y-5">
      <Link
        to="/consignacao"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Consignação
      </Link>

      {/* Cabeçalho */}
      <section className="rounded-lg border bg-card p-5 shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 font-serif text-xl text-gold">
              {seller.name.charAt(0)}
            </span>
            <div>
              <h1 className="font-serif text-2xl font-medium text-foreground">
                {seller.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {seller.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-gold/30 bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
              Comissão {seller.commissionRate}%
            </span>
            <StatusBadge
              status={seller.status}
              label={SELLER_STATUS_LABEL[seller.status]}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Peças em posse</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {stats.inHand}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Valor em posse</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {formatCurrency(stats.inHandValue)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Total vendido</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {formatCurrency(stats.totalSoldValue)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Comissão total</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-gold">
              {formatCurrency(stats.totalCommission)}
            </p>
          </div>
        </div>
      </section>

      {/* Comissão apurada + prazos */}
      <section className="rounded-lg border bg-card p-5 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-medium text-foreground">
              Comissão apurada
            </h2>
            <p className="text-sm text-muted-foreground">
              Vendas do período × {seller.commissionRate}%
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Vendas</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {commission.soldCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor vendido</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(commission.soldValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comissão a receber</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-gold">
              {formatCurrency(commission.commission)}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Prazos de pagamento
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {db.settings.paymentTerms.map((term) => {
            const items = soldInPeriod.filter((i) => i.soldAt);
            const value = items.reduce((s, i) => s + i.value, 0);
            const latest = items.length
              ? items.reduce(
                  (max, i) =>
                    new Date(addDays(new Date(i.soldAt!), term)) > new Date(max)
                      ? addDays(new Date(i.soldAt!), term).toISOString()
                      : max,
                  addDays(new Date(items[0].soldAt!), term).toISOString(),
                )
              : null;
            return (
              <div
                key={term}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {term} dias · {items.length} venda
                    {items.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(value)}
                  </p>
                </div>
                <div className="text-right">
                  {latest && (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        Previsão
                      </p>
                      <p className="text-xs text-foreground">
                        {formatDate(latest)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Histórico de lotes */}
      <section className="rounded-lg border bg-card shadow-none">
        <div className="border-b px-5 py-4">
          <h2 className="font-serif text-lg font-medium text-foreground">
            Histórico de lotes
          </h2>
        </div>
        <div className="divide-y divide-border">
          {consignments.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum lote entregue para esta vendedora.
            </p>
          )}
          {consignments.map((c) => {
            const status = consignmentViewStatus(c);
            const sold = c.items.filter((i) => i.status === "vendida").length;
            const returned = c.items.filter(
              (i) => i.status === "devolvida",
            ).length;
            const withSeller = c.items.filter(
              (i) => i.status === "com_vendedora",
            );
            const isOpen = expanded === c.id;
            const days = Math.round(
              (new Date(c.dueAt).getTime() - Date.now()) / 86_400_000,
            );
            return (
              <div key={c.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
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
                      <PieceCode code={c.code} />
                      <span className="text-sm text-muted-foreground">
                        Entregue em {formatDate(c.deliveredAt)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · Devolução{" "}
                        <span className="text-foreground">
                          {formatDate(c.dueAt)}
                        </span>
                        {c.status === "aberta" && (
                          <span className="ml-1 text-xs">
                            {formatRelativeDays(days)}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.items.length} peça{c.items.length === 1 ? "" : "s"} ·{" "}
                      {sold} vendida{sold === 1 ? "" : "s"} · {returned}{" "}
                      devolvida
                      {returned === 1 ? "" : "s"} ·{" "}
                      {formatCurrency(c.items.reduce((s, i) => s + i.value, 0))}
                    </p>
                  </div>
                  <StatusBadge
                    status={status}
                    label={CONSIGNMENT_STATUS_LABEL[status]}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-1.5 px-5 pb-4 pl-11">
                    {c.items.map((item) => (
                      <div
                        key={item.pieceId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <PieceCode code={item.code} />
                          <span className="text-sm text-muted-foreground">
                            {item.type} · {formatCurrency(item.value)}
                          </span>
                        </div>
                        {item.status === "com_vendedora" && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSold(c.id, item.pieceId, item.code)
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                              Vendida
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleReturned(c.id, item.pieceId, item.code)
                              }
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Devolvida
                            </Button>
                          </div>
                        )}
                        {item.status === "vendida" && (
                          <span className="flex items-center gap-1.5 text-xs text-success">
                            <HandCoins className="h-3.5 w-3.5" />
                            Vendida em {formatDate(item.soldAt!)}
                          </span>
                        )}
                        {item.status === "devolvida" && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Undo2 className="h-3.5 w-3.5" />
                            Devolvida em {formatDate(item.returnedAt!)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
