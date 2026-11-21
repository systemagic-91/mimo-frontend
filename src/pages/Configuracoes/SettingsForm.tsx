import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useUpdateSettingsMutation } from "@/lib/api/hooks";
import type { SettingsDto, UpdateSettingsRequest } from "@/lib/api/types";
import { getAdminErrorMessage, getFieldErrors } from "./admin-errors";
import { commissionOptions } from "./commission-options";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { FieldError } from "./FieldError";

/** Prazos de pagamento aceitos pelo backend; fixos nesta versão (BACK_06/BACK_27). */
const PAYMENT_TERM_OPTIONS = [30, 60, 90];

/** Fusos horários do Brasil (IDs IANA). O fuso salvo aparece mesmo se não estiver na lista. */
const TIMEZONE_OPTIONS: { id: string; label: string }[] = [
  { id: "America/Sao_Paulo", label: "Brasília (São Paulo, Rio, Sul, Nordeste)" },
  { id: "America/Fortaleza", label: "Fortaleza" },
  { id: "America/Recife", label: "Recife" },
  { id: "America/Bahia", label: "Bahia" },
  { id: "America/Belem", label: "Belém" },
  { id: "America/Manaus", label: "Manaus (Amazonas)" },
  { id: "America/Cuiaba", label: "Cuiabá (Mato Grosso)" },
  { id: "America/Campo_Grande", label: "Campo Grande (Mato Grosso do Sul)" },
  { id: "America/Porto_Velho", label: "Porto Velho (Rondônia)" },
  { id: "America/Rio_Branco", label: "Rio Branco (Acre)" },
  { id: "America/Noronha", label: "Fernando de Noronha" },
];

/** Formulário dos parâmetros da loja. Recebe os valores já carregados de `GET /settings`. */
export function SettingsForm({ settings }: { settings: SettingsDto }) {
  const updateSettings = useUpdateSettingsMutation();
  const [defaultRate, setDefaultRate] = useState(String(settings.defaultCommissionRate));
  const [terms, setTerms] = useState<number[]>([...settings.paymentTerms]);
  const [consignmentDays, setConsignmentDays] = useState(String(settings.defaultConsignmentDays));
  const [timezone, setTimezone] = useState(settings.timezone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingTimezone, setConfirmingTimezone] = useState(false);
  const pending = updateSettings.isPending;

  const rateOptions = commissionOptions(settings);
  const timezoneOptions = TIMEZONE_OPTIONS.some((option) => option.id === settings.timezone)
    ? TIMEZONE_OPTIONS
    : [{ id: settings.timezone, label: settings.timezone }, ...TIMEZONE_OPTIONS];
  const removedTerms = settings.paymentTerms.filter((term) => !terms.includes(term));

  const toggleTerm = (term: number) =>
    setTerms((current) =>
      current.includes(term)
        ? current.filter((value) => value !== term)
        : [...current, term].sort((a, b) => a - b),
    );

  const save = (input: UpdateSettingsRequest) =>
    updateSettings.mutate(input, {
      onSuccess: () => {
        setConfirmingTimezone(false);
        toast.success("Parâmetros salvos.");
      },
      onError: (cause) => {
        setConfirmingTimezone(false);
        const fields = getFieldErrors(cause);
        setFieldErrors(fields);
        if (Object.keys(fields).length === 0) toast.error(getAdminErrorMessage(cause));
      },
    });

  const buildInput = (): UpdateSettingsRequest | null => {
    const local: Record<string, string> = {};
    const days = Number(consignmentDays);
    if (!Number.isInteger(days) || days < 1) {
      local.defaultConsignmentDays = "O prazo da consignação precisa ser de pelo menos 1 dia.";
    }
    if (terms.length === 0) {
      local.paymentTerms = "Marque pelo menos um prazo de pagamento.";
    }
    setFieldErrors(local);
    if (Object.keys(local).length) return null;
    // O backend exige os quatro campos em todo envio.
    return {
      defaultCommissionRate: Number(defaultRate),
      paymentTerms: terms,
      defaultConsignmentDays: days,
      timezone,
    };
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const input = buildInput();
    if (!input) return;
    // Mudar o fuso muda o que conta como "hoje" nos vencimentos e relatórios: confirmar antes.
    if (input.timezone !== settings.timezone) return setConfirmingTimezone(true);
    save(input);
  };

  return (
    <>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Faixa de comissão: {settings.commissionMin}% a {settings.commissionMax}% em passos de{" "}
        {settings.commissionStep}%.
      </p>

      <Separator className="my-4" />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-rate">Comissão padrão para novas vendedoras</Label>
            <Select value={defaultRate} onValueChange={setDefaultRate} disabled={pending}>
              <SelectTrigger id="cfg-rate" aria-invalid={Boolean(fieldErrors.defaultCommissionRate)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rateOptions.map((rate) => (
                  <SelectItem key={rate} value={String(rate)}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.defaultCommissionRate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-days">Prazo padrão da consignação (dias)</Label>
            <Input
              id="cfg-days"
              type="number"
              min="1"
              step="1"
              value={consignmentDays}
              onChange={(event) => setConsignmentDays(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.defaultConsignmentDays)}
            />
            <FieldError message={fieldErrors.defaultConsignmentDays} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cfg-timezone">Fuso horário da loja</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={pending}>
              <SelectTrigger id="cfg-timezone" aria-invalid={Boolean(fieldErrors.timezone)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.timezone} />
            <p className="text-xs text-muted-foreground">
              Define o que conta como “hoje” para vencimentos e relatórios.
            </p>
          </div>
        </div>

        <fieldset className="mt-5 space-y-2" disabled={pending}>
          <legend className="text-sm font-medium leading-none">Prazos de pagamento dos lotes</legend>
          <div className="flex flex-wrap gap-4 pt-2">
            {PAYMENT_TERM_OPTIONS.map((term) => (
              <label
                key={term}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground"
              >
                <Checkbox
                  checked={terms.includes(term)}
                  onCheckedChange={() => toggleTerm(term)}
                  aria-invalid={Boolean(fieldErrors.paymentTerms)}
                />
                {term} dias
              </label>
            ))}
          </div>
          <FieldError message={fieldErrors.paymentTerms} />
          <p className="text-xs text-muted-foreground">
            São os prazos oferecidos ao criar um lote novo. Os lotes já criados mantêm o prazo que
            tinham.
            {removedTerms.length > 0 &&
              ` Ao salvar, ${removedTerms.join(" e ")} dias deixam de aparecer nos lotes novos.`}
          </p>
        </fieldset>

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "Salvando…" : "Salvar parâmetros"}
          </Button>
        </div>
      </form>

      <ConfirmActionDialog
        open={confirmingTimezone}
        title="Mudar o fuso horário?"
        description="O fuso define o que conta como “hoje”: vencimentos dos lotes, atrasos e os períodos dos relatórios passam a ser calculados no novo fuso."
        confirmLabel="Mudar fuso"
        pending={pending}
        onConfirm={() => {
          const input = buildInput();
          if (input) save(input);
          else setConfirmingTimezone(false);
        }}
        onCancel={() => setConfirmingTimezone(false)}
      />
    </>
  );
}
