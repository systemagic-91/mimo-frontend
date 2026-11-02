import { useState } from "react";
import { toast } from "sonner";
import { PieceCode } from "@/components/piece-code";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { usePieceNextCodeQuery, useReceivePieceMutation } from "@/lib/api/hooks";
import { fromBackendPieceStage } from "@/lib/api/mappers";
import type { ReceivePieceInput } from "@/lib/api/pieces";
import type { PieceDto } from "@/lib/api/types";
import { getPieceErrorMessage, parseMoneyToCents } from "@/lib/piece-errors";
import { PIECE_TYPES, STAGE_LABEL } from "@/lib/status";

type InitialStage = ReceivePieceInput["stage"];

/**
 * Recebimento de peça da fábrica ou do banho. Montado só enquanto aberto.
 * Um "tentar de novo" com os mesmos dados reaproveita a Idempotency-Key, então nunca cria duas peças.
 */
export function ReceivePieceDialog({
  onClose,
  onReceived,
}: {
  onClose: () => void;
  onReceived: (piece: PieceDto) => void;
}) {
  const receive = useReceivePieceMutation();
  const nextCode = usePieceNextCodeQuery();
  const idempotency = useIdempotencyKey();
  const [type, setType] = useState<string>(PIECE_TYPES[0]);
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<InitialStage>("fabrica");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = receive.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valueCents = parseMoneyToCents(value);
    if (valueCents === null) {
      setError("Informe um valor maior que zero, com até 2 casas decimais (ex.: 84,90).");
      return;
    }
    setError(null);
    const input: ReceivePieceInput = {
      type,
      valueCents,
      stage,
      note: note.trim() || undefined,
    };
    receive.mutate(
      { input, idempotencyKey: idempotency.keyFor(input) },
      {
        onSuccess: ({ piece }) => {
          idempotency.reset();
          const status = STAGE_LABEL[fromBackendPieceStage(piece.status)];
          toast.success("Peça recebida", {
            description: `${piece.code} registrada como ${status}.`,
          });
          onReceived(piece);
        },
        onError: (cause) => setError(getPieceErrorMessage(cause)),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receber peça</DialogTitle>
          <DialogDescription>
            Registre a chegada da peça da fábrica ou o envio ao banho de ouro. O
            código é gerado pelo sistema ao salvar.
          </DialogDescription>
        </DialogHeader>

        <form id="receive-piece-form" onSubmit={handleSubmit} className="space-y-4">
          {nextCode.data && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Próximo código (prévia)</span>
              <PieceCode code={nextCode.data.code} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-type">Tipo</Label>
              <Select value={type} onValueChange={setType} disabled={pending}>
                <SelectTrigger id="rec-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIECE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-value">Valor de venda (R$)</Label>
              <Input
                id="rec-value"
                inputMode="decimal"
                placeholder="84,90"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                disabled={pending}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-stage">Onde está</Label>
            <Select
              value={stage}
              onValueChange={(next) => setStage(next as InitialStage)}
              disabled={pending}
            >
              <SelectTrigger id="rec-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fabrica">Na fábrica</SelectItem>
                <SelectItem value="banho_ouro">Enviada ao banho de ouro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-note">Observação (opcional)</Label>
            <Input
              id="rec-note"
              placeholder="Lote do fornecedor, cor, etc."
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={pending}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="receive-piece-form" disabled={pending}>
            {pending
              ? "Salvando…"
              : receive.isError
                ? "Tentar de novo"
                : "Confirmar recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
