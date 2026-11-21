import { useTranslation } from "react-i18next";
import { FieldError } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Campo opcional de custo em reais (só owner). Vazio = "não informado"; zero é um custo válido. */
export function CostField({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** O texto não é um valor válido. */
  invalid?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={t("common.notInformed")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
      />
      <FieldError
        message={invalid ? t("costs.invalid") : undefined}
      />
    </div>
  );
}
