import { Gem } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { PieceCode } from "@/components/piece-code";
import { StatusBadge } from "@/components/status-badge";
import { PieceTimeline } from "@/components/piece-timeline";
import { pieceEvents } from "@/lib/domain";
import { useDb } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Piece } from "@/lib/types";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function PieceDetailSheet({
  piece,
  open,
  onOpenChange,
}: {
  piece: Piece | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const db = useDb();
  const events = piece ? pieceEvents(db, piece.id) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {piece && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between gap-2">
                <PieceCode code={piece.code} className="text-lg" />
                <StatusBadge
                  status={piece.status}
                  label={STAGE_LABEL[piece.status]}
                />
              </div>
              <SheetDescription>
                {piece.type} · {formatCurrency(piece.value)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {piece.photo ? (
                <img
                  src={piece.photo}
                  alt={piece.code}
                  crossOrigin="anonymous"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Gem className="h-8 w-8 text-muted-foreground/60" />
              )}
            </div>

            <div className="mt-4 space-y-2.5 rounded-lg border bg-muted/30 p-4">
              <InfoRow label="Tipo" value={piece.type} />
              <InfoRow label="Valor" value={formatCurrency(piece.value)} />
              <InfoRow label="Localização" value={piece.currentLocation} />
              <InfoRow
                label="Recebida em"
                value={formatDate(piece.createdAt)}
              />
              {piece.note && <InfoRow label="Observação" value={piece.note} />}
            </div>

            <Separator className="my-5" />
            <h4 className="mb-4 font-serif text-base font-medium text-foreground">
              Linha do tempo
            </h4>
            <PieceTimeline events={events} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
