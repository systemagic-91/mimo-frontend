import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { useDb } from "@/lib/db";
import { getSellersTable } from "@/lib/domain";
import { formatCurrency, formatDate, formatRelativeDays } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Consignacao() {
  const db = useDb();
  const navigate = useNavigate();
  const rows = useMemo(() => getSellersTable(db), [db]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Consignação
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length} vendedora{rows.length === 1 ? "" : "s"} cadastrada
            {rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => navigate("/consignacao/nova")}>
          <PackagePlus className="h-4 w-4" />
          Nova consignação
        </Button>
      </header>

      <section className="overflow-hidden rounded-lg border bg-card shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Vendedora</TableHead>
              <TableHead className="text-right">Peças em posse</TableHead>
              <TableHead className="text-right">Valor em posse</TableHead>
              <TableHead>Prazo de devolução</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma vendedora cadastrada.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const status =
                row.seller.status === "inativa"
                  ? "inativa"
                  : row.late
                    ? "atrasada"
                    : "em_dia";
              return (
                <TableRow
                  key={row.seller.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/consignacao/${row.seller.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 font-serif text-sm text-gold">
                        {row.seller.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {row.seller.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.seller.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {row.piecesInHand}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatCurrency(row.valueInHand)}
                  </TableCell>
                  <TableCell>
                    {row.nextDueAt ? (
                      <>
                        <span className="text-foreground">
                          {formatDate(row.nextDueAt)}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.nextDueDays !== null &&
                            formatRelativeDays(row.nextDueDays)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge
                      status={status}
                      label={
                        status === "em_dia"
                          ? "Em dia"
                          : status === "atrasada"
                            ? "Atrasado"
                            : "Inativa"
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
