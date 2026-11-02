import { Gem } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { PieceCode } from "@/components/piece-code";
import { RemoteQueryState } from "@/components/remote-query-state";
import { StatusBadge } from "@/components/status-badge";
import { PieceTimeline } from "@/components/piece-timeline";
import { usePieceEventsQuery, usePieceQuery } from "@/lib/api/hooks";
import { centsToMoney, fromBackendPieceStage } from "@/lib/api/mappers";
import type { PieceDto } from "@/lib/api/types";
import { getPieceErrorMessage } from "@/lib/piece-errors";
import { STAGE_LABEL } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";

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

/** Detalhe de uma peça, lido do backend (dados, foto e linha do tempo). */
export function PieceDetailSheet({
  pieceId,
  open,
  onOpenChange,
}: {
  pieceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const enabled = open && Boolean(pieceId);
  const piece = usePieceQuery(pieceId ?? "", enabled);
  const events = usePieceEventsQuery(pieceId ?? "", enabled);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {piece.isPending ? (
          <>
            <SheetTitle className="sr-only">Detalhe da peça</SheetTitle>
            <RemoteQueryState state="loading" />
          </>
        ) : piece.isError ? (
          <>
            <SheetTitle className="sr-only">Detalhe da peça</SheetTitle>
            <RemoteQueryState
              state="error"
              message={getPieceErrorMessage(piece.error)}
              onRetry={() => void piece.refetch()}
            />
          </>
        ) : (
          <PieceDetails piece={piece.data}>
            {events.isPending ? (
              <RemoteQueryState state="loading" />
            ) : events.isError ? (
              <RemoteQueryState
                state="error"
                message="Não foi possível carregar a linha do tempo."
                onRetry={() => void events.refetch()}
              />
            ) : (
              <PieceTimeline events={events.data} />
            )}
          </PieceDetails>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PieceDetails({
  piece,
  children,
}: {
  piece: PieceDto;
  children: React.ReactNode;
}) {
  const stage = fromBackendPieceStage(piece.status);
  const value = formatCurrency(centsToMoney(piece.valueCents));
  return (
    <>
      <SheetHeader className="text-left">
        <div className="flex items-center justify-between gap-2">
          <SheetTitle>
            <PieceCode code={piece.code} className="text-lg" />
          </SheetTitle>
          <StatusBadge status={stage} label={STAGE_LABEL[stage]} />
        </div>
        <SheetDescription>
          {piece.type} · {value}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {piece.photoUrl ? (
          <img
            src={piece.photoUrl}
            alt={`Foto da peça ${piece.code}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Gem className="h-8 w-8 text-muted-foreground/60" />
        )}
      </div>

      <div className="mt-4 space-y-2.5 rounded-lg border bg-muted/30 p-4">
        <InfoRow label="Tipo" value={piece.type} />
        <InfoRow label="Valor" value={value} />
        <InfoRow label="Localização" value={piece.currentLocation} />
        <InfoRow label="Recebida em" value={formatDate(piece.createdAt)} />
        {piece.note && <InfoRow label="Observação" value={piece.note} />}
      </div>

      <Separator className="my-5" />
      <h4 className="mb-4 font-serif text-base font-medium text-foreground">
        Linha do tempo
      </h4>
      {children}
    </>
  );
}
