import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { useCreateSellerMutation, useUpdateSellerMutation } from "@/lib/api/hooks";
import type { SellerDto, SettingsDto, UpdateSellerRequest } from "@/lib/api/types";
import { getAdminErrorMessage, getFieldErrors } from "./admin-errors";
import { commissionOptions } from "./commission-options";
import { FieldError } from "@/components/field-error";

/**
 * Cadastra uma vendedora ou edita nome, telefone e comissão.
 * Montado só enquanto aberto, para o formulário começar sempre dos dados da API.
 */
export function SellerFormDialog({
  seller,
  settings,
  onClose,
}: {
  /** `null` cadastra uma vendedora nova. */
  seller: SellerDto | null;
  settings: SettingsDto;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const createSeller = useCreateSellerMutation();
  const updateSeller = useUpdateSellerMutation();
  const idempotency = useIdempotencyKey();
  const [name, setName] = useState(seller?.name ?? "");
  const [phone, setPhone] = useState(seller?.phone ?? "");
  const [rate, setRate] = useState(
    String(seller?.commissionRate ?? settings.defaultCommissionRate),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const pending = createSeller.isPending || updateSeller.isPending;
  const options = commissionOptions(settings);
  // Uma taxa antiga fora da faixa atual continua visível até ser trocada.
  if (seller && !options.includes(seller.commissionRate)) {
    options.push(seller.commissionRate);
    options.sort((a, b) => a - b);
  }
  const rateChanged = seller !== null && Number(rate) !== seller.commissionRate;

  const handleError = (cause: unknown) => {
    const fields = getFieldErrors(cause);
    setFieldErrors(fields);
    setError(Object.keys(fields).length ? null : getAdminErrorMessage(cause));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = t("sellers.form.nameRequired");
    if (!phone.trim()) local.phone = t("sellers.form.phoneRequired");
    setFieldErrors(local);
    if (Object.keys(local).length) return;

    if (!seller) {
      const input = { name: name.trim(), phone: phone.trim(), commissionRate: Number(rate) };
      // Mesma chave enquanto os dados forem iguais: repetir depois de uma falha de rede não duplica a vendedora.
      createSeller.mutate(
        { input, idempotencyKey: idempotency.keyFor(input) },
        {
          onSuccess: (created) => {
            idempotency.reset();
            toast.success(t("sellers.form.created", { name: created.name }));
            onClose();
          },
          onError: handleError,
        },
      );
      return;
    }

    const input: UpdateSellerRequest = {};
    if (name.trim() !== seller.name) input.name = name.trim();
    if (phone.trim() !== seller.phone) input.phone = phone.trim();
    if (rateChanged) input.commissionRate = Number(rate);
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    updateSeller.mutate(
      { id: seller.id, input },
      {
        onSuccess: () => {
          toast.success(t("sellers.form.updated"));
          onClose();
        },
        onError: handleError,
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{seller ? t("sellers.form.editTitle") : t("sellers.form.newTitle")}</DialogTitle>
          <DialogDescription>
            {seller
              ? t("sellers.form.editDescription")
              : t("sellers.form.newDescription")}
          </DialogDescription>
        </DialogHeader>

        <form id="seller-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="seller-name">{t("common.name")}</Label>
            <Input
              id="seller-name"
              value={name}
              maxLength={120}
              placeholder={t("sellers.form.namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seller-phone">{t("common.phone")}</Label>
            <Input
              id="seller-phone"
              value={phone}
              maxLength={40}
              placeholder="(11) 90000-0000"
              onChange={(event) => setPhone(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <FieldError message={fieldErrors.phone} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seller-rate">{t("common.commission")}</Label>
            <Select value={rate} onValueChange={setRate} disabled={pending}>
              <SelectTrigger id="seller-rate" aria-invalid={Boolean(fieldErrors.commissionRate)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.commissionRate} />
            {rateChanged && (
              <p className="text-xs text-muted-foreground">
                {t("sellers.form.rateChangeHint")}
              </p>
            )}
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
          <Button type="submit" form="seller-form" disabled={pending}>
            {pending ? t("common.saving") : seller ? t("common.saveChanges") : t("common.register")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
