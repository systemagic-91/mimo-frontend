import { useState } from "react";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { formatList } from "@/lib/format";
import type { SettingsDto, UpdateSettingsRequest } from "@/lib/api/types";
import { getAdminErrorMessage, getFieldErrors } from "./admin-errors";
import { commissionOptions } from "./commission-options";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { FieldError } from "@/components/field-error";

/** Prazos de pagamento aceitos pelo backend; fixos nesta versão (BACK_06/BACK_27). */
const PAYMENT_TERM_OPTIONS = [30, 60, 90];

/** Fusos horários do Brasil (IDs IANA) e a chave do rótulo. O fuso salvo aparece mesmo se não estiver na lista. */
const TIMEZONE_OPTIONS: { id: string; label: string }[] = [
  { id: "America/Sao_Paulo", label: "settings.tz.saoPaulo" },
  { id: "America/Fortaleza", label: "settings.tz.fortaleza" },
  { id: "America/Recife", label: "settings.tz.recife" },
  { id: "America/Bahia", label: "settings.tz.bahia" },
  { id: "America/Belem", label: "settings.tz.belem" },
  { id: "America/Manaus", label: "settings.tz.manaus" },
  { id: "America/Cuiaba", label: "settings.tz.cuiaba" },
  { id: "America/Campo_Grande", label: "settings.tz.campoGrande" },
  { id: "America/Porto_Velho", label: "settings.tz.portoVelho" },
  { id: "America/Rio_Branco", label: "settings.tz.rioBranco" },
  { id: "America/Noronha", label: "settings.tz.noronha" },
];

/** Formulário dos parâmetros da loja. Recebe os valores já carregados de `GET /settings`. */
export function SettingsForm({ settings }: { settings: SettingsDto }) {
  const { t } = useTranslation();
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
    : [{ id: settings.timezone, label: "" }, ...TIMEZONE_OPTIONS];
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
        toast.success(t("settings.params.saved"));
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
      local.defaultConsignmentDays = t("settings.params.daysInvalid");
    }
    if (terms.length === 0) {
      local.paymentTerms = t("settings.params.termsRequired");
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
        {t("settings.params.range", {
          min: settings.commissionMin,
          max: settings.commissionMax,
          step: settings.commissionStep,
        })}
      </p>

      <Separator className="my-4" />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-rate">{t("settings.params.defaultRate")}</Label>
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
            <Label htmlFor="cfg-days">{t("settings.params.defaultDays")}</Label>
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
            <Label htmlFor="cfg-timezone">{t("settings.params.timezone")}</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={pending}>
              <SelectTrigger id="cfg-timezone" aria-invalid={Boolean(fieldErrors.timezone)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label ? t(option.label) : option.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.timezone} />
            <p className="text-xs text-muted-foreground">
              {t("settings.params.timezoneHint")}
            </p>
          </div>
        </div>

        <fieldset className="mt-5 space-y-2" disabled={pending}>
          <legend className="text-sm font-medium leading-none">{t("settings.params.terms")}</legend>
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
                {t("common.days", { count: term })}
              </label>
            ))}
          </div>
          <FieldError message={fieldErrors.paymentTerms} />
          <p className="text-xs text-muted-foreground">
            {t("settings.params.termsHint")}
            {removedTerms.length > 0 &&
              t("settings.params.termsRemoved", {
                terms: formatList(removedTerms.map(String)),
              })}
          </p>
        </fieldset>

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? t("common.saving") : t("settings.params.save")}
          </Button>
        </div>
      </form>

      <ConfirmActionDialog
        open={confirmingTimezone}
        title={t("settings.params.timezoneConfirmTitle")}
        description={t("settings.params.timezoneConfirmDescription")}
        confirmLabel={t("settings.params.timezoneConfirm")}
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
