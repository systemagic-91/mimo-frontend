import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { addDaysToDate } from "@/lib/store-time";
import { cn } from "@/lib/utils";

const QUICK_DAYS = [30, 45, 60];
export const NOTE_MAX = 500;

/** Passo 3: vencimento do lote (data local da loja), prazo de pagamento e observação. */
export function TermsStep({
  today,
  dueDate,
  onDueDateChange,
  defaultConsignmentDays,
  paymentTerms,
  paymentTermDays,
  onPaymentTermChange,
  note,
  onNoteChange,
  errors,
}: {
  /** Hoje no fuso da loja. */
  today: string;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  defaultConsignmentDays: number;
  paymentTerms: number[];
  paymentTermDays: number | null;
  onPaymentTermChange: (value: number) => void;
  note: string;
  onNoteChange: (value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 shadow-none">
      <div className="space-y-1.5">
        <Label htmlFor="due">Prazo de devolução</Label>
        <Input
          id="due"
          type="date"
          value={dueDate}
          min={today}
          max={addDaysToDate(today, 365)}
          onChange={(event) => onDueDateChange(event.target.value)}
          aria-invalid={Boolean(errors.dueDate)}
        />
        <FieldError message={errors.dueDate} />
        <p className="text-xs text-muted-foreground">
          Prazo padrão: {defaultConsignmentDays} dias. O lote vence no fim do dia escolhido.
        </p>
        <div className="flex gap-2 pt-1">
          {QUICK_DAYS.map((days) => (
            <Button
              key={days}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDueDateChange(addDaysToDate(today, days))}
            >
              +{days} dias
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">Prazo de pagamento</legend>
        <p className="text-xs text-muted-foreground">
          Cada venda vence nesse número de dias depois da data da venda.
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Prazo de pagamento">
          {paymentTerms.map((term) => (
            <button
              key={term}
              type="button"
              role="radio"
              aria-checked={paymentTermDays === term}
              onClick={() => onPaymentTermChange(term)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors",
                paymentTermDays === term
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/40",
              )}
            >
              {term} dias
            </button>
          ))}
        </div>
        <FieldError message={errors.paymentTermDays} />
      </fieldset>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="note">Observação (opcional)</Label>
        <Textarea
          id="note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="Condições do lote, combinações, etc."
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          aria-invalid={Boolean(errors.note)}
        />
        <FieldError message={errors.note} />
      </div>
    </section>
  );
}
