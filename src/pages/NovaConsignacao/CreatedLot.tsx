import { CheckCircle2, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { ConsignmentReceipt } from "@/components/consignment-receipt";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import type { ConsignmentDetailsDto } from "@/lib/api/types";
import { formatCents, formatDate } from "@/lib/format";

/** Lote criado: tudo vem da resposta `201` (código oficial, vencimento e snapshots). */
export function CreatedLot({
  consignment,
  timeZone,
  onNew,
}: {
  consignment: ConsignmentDetailsDto;
  timeZone: string;
  onNew: () => void;
}) {
  const totalCents = consignment.items.reduce((sum, item) => sum + item.valueCentsSnapshot, 0);

  return (
    <>
      <section className="no-print space-y-4 rounded-lg border bg-card p-5 shadow-none">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
          <div>
            <h2 className="font-serif text-lg font-medium text-foreground">
              Lote <PieceCode code={consignment.code} className="text-lg" /> entregue
            </h2>
            <p className="text-sm text-muted-foreground">
              {consignment.items.length} peça{consignment.items.length === 1 ? "" : "s"} com{" "}
              {consignment.seller.name} · devolução em {formatDate(consignment.dueAt, timeZone)} ·
              pagamento em {consignment.paymentTermDays} dias ·{" "}
              {formatCents(totalCents)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir romaneio
          </Button>
          <Button asChild>
            <Link to={`/consignacao/${consignment.sellerId}`}>Ver lotes da vendedora</Link>
          </Button>
          <Button variant="ghost" onClick={onNew}>
            Nova consignação
          </Button>
        </div>
      </section>
      <ConsignmentReceipt consignment={consignment} timeZone={timeZone} />
    </>
  );
}
