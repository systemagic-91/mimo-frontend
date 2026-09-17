import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { useDb } from "@/lib/db";
import { getOverdueSellers, getStalePieces, getTurnover } from "@/lib/domain";
import {
  exportCsv,
  formatCurrency,
  formatDate,
  toDateInputValue,
} from "@/lib/format";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ExportButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <FileDown className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}

const dec = (v: number) => v.toFixed(2).replace(".", ",");

export default function Relatorios() {
  const db = useDb();
  const [from, setFrom] = useState(() =>
    toDateInputValue(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
  );
  const [to, setTo] = useState(() => toDateInputValue(new Date()));

  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const toIso = new Date(`${to}T23:59:59`).toISOString();

  const turnover = useMemo(
    () => getTurnover(db, fromIso, toIso),
    [db, fromIso, toIso],
  );
  const overdue = useMemo(() => getOverdueSellers(db), [db]);
  const stale = useMemo(() => getStalePieces(db, 60), [db]);

  const exportTurnover = () =>
    exportCsv(
      "giro-de-pecas.csv",
      ["Codigo", "Tipo", "Valor", "Vendida em", "Vendedora", "Dias ate venda"],
      turnover.map((r) => [
        r.code,
        r.type,
        dec(r.value),
        formatDate(r.soldAt),
        r.sellerName,
        r.daysToSell ?? "",
      ]),
    );

  const exportOverdue = () =>
    exportCsv(
      "inadimplencia.csv",
      [
        "Vendedora",
        "Telefone",
        "Lotes atrasados",
        "Pecas em posse",
        "Valor em risco",
        "Maior atraso (dias)",
      ],
      overdue.map((r) => [
        r.sellerName,
        r.phone,
        r.lateLots,
        r.piecesInHand,
        dec(r.valueAtRisk),
        r.maxOverdueDays,
      ]),
    );

  const exportStale = () =>
    exportCsv(
      "pecas-paradas.csv",
      ["Codigo", "Tipo", "Valor", "Parada ha (dias)"],
      stale.map((p) => [p.code, p.type, dec(p.value), p.daysStopped]),
    );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-2xl font-medium text-foreground">
          Relatórios
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Giro, inadimplência e estoque parado — exportáveis em CSV
        </p>
      </header>

      <Tabs defaultValue="giro">
        <TabsList>
          <TabsTrigger value="giro">Giro de peças</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          <TabsTrigger value="paradas">Peças paradas</TabsTrigger>
        </TabsList>

        {/* Giro */}
        <TabsContent value="giro" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="g-from">De</Label>
                <Input
                  id="g-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-to">Até</Label>
                <Input
                  id="g-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <ExportButton
              onClick={exportTurnover}
              disabled={turnover.length === 0}
            />
          </div>

          <section className="overflow-hidden rounded-lg border bg-card shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vendida em</TableHead>
                  <TableHead>Vendedora</TableHead>
                  <TableHead className="text-right">Dias até venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnover.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                )}
                {turnover.map((r) => (
                  <TableRow
                    key={`${r.code}-${r.soldAt}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell>
                      <PieceCode code={r.code} />
                    </TableCell>
                    <TableCell className="text-foreground">{r.type}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatCurrency(r.value)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.soldAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.sellerName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {r.daysToSell ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* Inadimplência */}
        <TabsContent value="inadimplencia" className="space-y-4">
          <div className="flex items-end justify-between">
            <p className="text-sm text-muted-foreground">
              Vendedoras com consignações em aberto após o prazo
            </p>
            <ExportButton
              onClick={exportOverdue}
              disabled={overdue.length === 0}
            />
          </div>
          <section className="overflow-hidden rounded-lg border bg-card shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Vendedora</TableHead>
                  <TableHead className="text-right">Lotes atrasados</TableHead>
                  <TableHead className="text-right">Peças em posse</TableHead>
                  <TableHead className="text-right">Valor em risco</TableHead>
                  <TableHead className="text-right">Maior atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Nenhuma inadimplência. Todas as vendedoras estão em dia.
                    </TableCell>
                  </TableRow>
                )}
                {overdue.map((r) => (
                  <TableRow key={r.sellerId} className="hover:bg-transparent">
                    <TableCell className="font-medium text-foreground">
                      {r.sellerName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.lateLots}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.piecesInHand}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {formatCurrency(r.valueAtRisk)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {r.maxOverdueDays} dia{r.maxOverdueDays === 1 ? "" : "s"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* Paradas */}
        <TabsContent value="paradas" className="space-y-4">
          <div className="flex items-end justify-between">
            <p className="text-sm text-muted-foreground">
              Peças etiquetadas paradas em estoque há mais de 60 dias
            </p>
            <ExportButton onClick={exportStale} disabled={stale.length === 0} />
          </div>
          <section className="overflow-hidden rounded-lg border bg-card shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Parada há</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stale.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Nenhuma peça parada acima de 60 dias.
                    </TableCell>
                  </TableRow>
                )}
                {stale.map((p) => (
                  <TableRow key={p.id} className="hover:bg-transparent">
                    <TableCell>
                      <PieceCode code={p.code} />
                    </TableCell>
                    <TableCell className="text-foreground">{p.type}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {formatCurrency(p.value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-late">
                      {p.daysStopped} dia{p.daysStopped === 1 ? "" : "s"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
