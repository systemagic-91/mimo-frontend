import { useNavigate } from "react-router-dom";
import { PieceCode } from "@/components/piece-code";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { centsToMoney } from "@/lib/api/mappers";
import type { ConsignmentListItem } from "@/lib/api/types";
import { formatCurrency, formatRelativeDays } from "@/lib/format";
import { CONSIGNMENT_STATUS_LABEL } from "@/lib/status";
import { formatDateInZone } from "@/lib/store-time";

/** Lotes abertos de `GET /dashboard`, já com status visual, dias até o vencimento e o que está em posse. */
export function OpenConsignmentsTable({
  consignments,
  timeZone,
}: {
  consignments: ConsignmentListItem[];
  timeZone: string;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-lg border bg-card shadow-none">
      <div className="border-b px-5 py-4">
        <h2 className="font-serif text-lg font-medium text-foreground">Consignações em aberto</h2>
      </div>
      <div className="overflow-x-auto">
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
            {consignments.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma consignação em aberto.
                </TableCell>
              </TableRow>
            )}
            {consignments.map((lot) => (
              <TableRow
                key={lot.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => navigate(`/consignacao/${lot.sellerId}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigate(`/consignacao/${lot.sellerId}`);
                }}
              >
                <TableCell>
                  <PieceCode code={lot.code} />
                </TableCell>
                <TableCell className="font-medium text-foreground">{lot.seller.name}</TableCell>
                <TableCell className="text-right tabular-nums">{lot.piecesInHand}</TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {formatCurrency(centsToMoney(lot.valueInHandCents))}
                </TableCell>
                <TableCell>
                  <span className="text-foreground">{formatDateInZone(lot.dueAt, timeZone)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatRelativeDays(lot.dueInDays)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StatusBadge status={lot.status} label={CONSIGNMENT_STATUS_LABEL[lot.status]} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
