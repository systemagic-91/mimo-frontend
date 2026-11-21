import { useState } from "react";
import { FieldError } from "@/components/field-error";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { endOfDayInZone } from "@/lib/store-time";

export type ItemAction = "sold" | "returned";

/**
 * Registra venda ou devolução numa data passada (prestação de contas atrasada).
 * Hoje não envia data (o servidor usa o horário atual); um dia anterior vai como 23:59:59 no fuso da loja.
 */
export function ItemDateDialog({
  code,
  minDate,
  today,
  timeZone,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  code: string;
  /** Dia da entrega do lote, no fuso da loja. */
  minDate: string;
  today: string;
  timeZone: string;
  pending: boolean;
  /** Erro de campo vindo da API (`fields.soldAt`/`fields.returnedAt`). */
  error?: string;
  onConfirm: (action: ItemAction, at: string | undefined) => void;
  onClose: () => void;
}) {
  const [action, setAction] = useState<ItemAction>("sold");
  const [date, setDate] = useState(today);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (!date || date < minDate || date > today) {
      setLocalError("A data precisa estar entre a entrega do lote e hoje.");
      return;
    }
    setLocalError(null);
    onConfirm(action, date === today ? undefined : endOfDayInZone(date, timeZone));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar {code} com data</DialogTitle>
          <DialogDescription>
            Para prestações de contas atrasadas. A data fica entre a entrega do lote e hoje.
          </DialogDescription>
        </DialogHeader>
        <form id="item-date-form" onSubmit={submit} className="space-y-4" noValidate>
          <RadioGroup
            value={action}
            onValueChange={(value) => setAction(value as ItemAction)}
            className="flex gap-6"
            aria-label="O que aconteceu"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="sold" aria-label="Vendida" />
              Vendida
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="returned" aria-label="Devolvida" />
              Devolvida
            </label>
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="item-date">Data</Label>
            <Input
              id="item-date"
              type="date"
              value={date}
              min={minDate}
              max={today}
              onChange={(event) => setDate(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(localError || error)}
            />
            <FieldError message={localError ?? error} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="item-date-form" disabled={pending}>
            {pending ? "Salvando…" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
