import { PieceCode } from "@/components/piece-code";
import { Separator } from "@/components/ui/separator";
import type { PieceDto, SellerDto } from "@/lib/api/types";
import { formatCents, formatLocalDate } from "@/lib/format";

/** Passo 4: confere o que vai ser enviado. O código do lote só existe depois da resposta da API. */
export function ReviewStep({
  seller,
  pieces,
  dueDate,
  paymentTermDays,
  note,
}: {
  seller: SellerDto;
  pieces: PieceDto[];
  dueDate: string;
  paymentTermDays: number;
  note: string;
}) {
  const totalCents = pieces.reduce((sum, piece) => sum + piece.valueCents, 0);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-none">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Vendedora</dt>
          <dd className="font-medium text-foreground">{seller.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Devolução em</dt>
          <dd className="font-medium text-foreground">{formatLocalDate(dueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Prazo de pagamento</dt>
          <dd className="font-medium text-foreground">{paymentTermDays} dias</dd>
        </div>
      </dl>
      {note.trim() && (
        <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {note.trim()}
        </p>
      )}
      <Separator className="my-4" />
      <ul className="space-y-1">
        {pieces.map((piece) => (
          <li key={piece.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-3">
              <PieceCode code={piece.code} />
              <span className="text-muted-foreground">{piece.type}</span>
            </span>
            <span className="tabular-nums text-foreground">
              {formatCents(piece.valueCents)}
            </span>
          </li>
        ))}
      </ul>
      <Separator className="my-4" />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {pieces.length} peça{pieces.length === 1 ? "" : "s"}
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatCents(totalCents)}
        </span>
      </div>
    </section>
  );
}
