import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CostField } from "@/components/cost-field";
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
import { useIsOwner } from "@/hooks/use-is-owner";
import { usePieceNextCodeQuery, useReceivePieceMutation } from "@/lib/api/hooks";
import { fromBackendPieceStage } from "@/lib/api/mappers";
import type { ReceivePieceInput } from "@/lib/api/pieces";
import type { PieceDto } from "@/lib/api/types";
import { getPieceErrorMessage, parseCostToCents, parseMoneyToCents } from "@/lib/piece-errors";
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
  const isOwner = useIsOwner();
  const { t } = useTranslation();
  const [type, setType] = useState<string>(PIECE_TYPES[0]);
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<InitialStage>("fabrica");
  const [note, setNote] = useState("");
  const [factoryCost, setFactoryCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = receive.isPending;
  const factoryCostCents = parseCostToCents(factoryCost);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valueCents = parseMoneyToCents(value);
    if (valueCents === null) {
      setError(t("piece.form.valueInvalid"));
      return;
    }
    if (isOwner && factoryCostCents === undefined) return;
    setError(null);
    const input: ReceivePieceInput = {
      type,
      valueCents,
      stage,
      note: note.trim() || undefined,
      // Só owner manda custo, e só quando informado: staff nunca envia o campo (o backend responde 403).
      ...(isOwner && factoryCostCents != null ? { factoryCostCents } : {}),
    };
    receive.mutate(
      { input, idempotencyKey: idempotency.keyFor(input) },
      {
        onSuccess: ({ piece }) => {
          idempotency.reset();
          const status = STAGE_LABEL[fromBackendPieceStage(piece.status)];
          toast.success(t("stock.receive.done"), {
            description: t("stock.receive.doneDescription", { code: piece.code, status }),
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
          <DialogTitle>{t("stock.receive.title")}</DialogTitle>
          <DialogDescription>
            {t("stock.receive.description")}
          </DialogDescription>
        </DialogHeader>

        <form id="receive-piece-form" onSubmit={handleSubmit} className="space-y-4">
          {nextCode.data && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">{t("stock.receive.nextCode")}</span>
              <PieceCode code={nextCode.data.code} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-type">{t("piece.form.type")}</Label>
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
              <Label htmlFor="rec-value">{t("piece.form.value")}</Label>
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
            <Label htmlFor="rec-stage">{t("stock.receive.stage")}</Label>
            <Select
              value={stage}
              onValueChange={(next) => setStage(next as InitialStage)}
              disabled={pending}
            >
              <SelectTrigger id="rec-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fabrica">{t("stock.receive.stage.fabrica")}</SelectItem>
                <SelectItem value="banho_ouro">{t("stock.receive.stage.banho_ouro")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isOwner && (
            <CostField
              id="rec-factory-cost"
              label={t("stock.receive.factoryCost")}
              value={factoryCost}
              onChange={setFactoryCost}
              disabled={pending}
              invalid={factoryCostCents === undefined}
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rec-note">{t("common.noteOptional")}</Label>
            <Input
              id="rec-note"
              placeholder={t("stock.receive.notePlaceholder")}
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
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="receive-piece-form" disabled={pending}>
            {pending
              ? t("common.saving")
              : receive.isError
                ? t("common.tryAgain")
                : t("stock.receive.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
