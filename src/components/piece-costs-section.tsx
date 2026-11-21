import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CostField } from "@/components/cost-field";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n/config";
import { useUpdatePieceCostsMutation } from "@/lib/api/hooks";
import type { PieceDto, UpdatePieceCostsRequest } from "@/lib/api/types";
import { formatCents } from "@/lib/format";
import { centsToInputValue, getPieceErrorMessage, parseCostToCents } from "@/lib/piece-errors";

function costLabel(cents: number | null | undefined): string {
  return cents == null ? i18n.t("costs.notInformed") : formatCents(cents);
}

function CostRow({ label, cents }: { label: string; cents: number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{costLabel(cents)}</span>
    </div>
  );
}

/**
 * Custos da peça (só owner; quem chama decide pelo papel). A edição manda só os campos alterados,
 * e `null` quando o owner apaga um valor.
 */
export function PieceCostsSection({ piece }: { piece: PieceDto }) {
  const updateCosts = useUpdatePieceCostsMutation();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [factory, setFactory] = useState("");
  const [bath, setBath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const factoryCents = parseCostToCents(factory);
  const bathCents = parseCostToCents(bath);
  const pending = updateCosts.isPending;

  const startEditing = () => {
    setFactory(piece.factoryCostCents == null ? "" : centsToInputValue(piece.factoryCostCents));
    setBath(piece.bathCostCents == null ? "" : centsToInputValue(piece.bathCostCents));
    setError(null);
    setEditing(true);
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || factoryCents === undefined || bathCents === undefined) return;
    const input: UpdatePieceCostsRequest = {};
    if (factoryCents !== (piece.factoryCostCents ?? null)) input.factoryCostCents = factoryCents;
    if (bathCents !== (piece.bathCostCents ?? null)) input.bathCostCents = bathCents;
    if (Object.keys(input).length === 0) {
      setEditing(false);
      return;
    }
    updateCosts.mutate(
      { id: piece.id, input },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(t("costs.saved"));
        },
        onError: (cause) => setError(getPieceErrorMessage(cause)),
      },
    );
  };

  if (!editing) {
    return (
      <div className="mt-4 space-y-2.5 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">{t("costs.title")}</h4>
          <Button variant="ghost" size="sm" className="h-7" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5" />
            {t("costs.edit")}
          </Button>
        </div>
        <CostRow label={t("costs.factory")} cents={piece.factoryCostCents} />
        <CostRow label={t("costs.bath")} cents={piece.bathCostCents} />
        <CostRow label={t("costs.total")} cents={piece.totalCostCents} />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4" noValidate>
      <h4 className="text-sm font-medium text-foreground">{t("costs.edit")}</h4>
      <CostField
        id="cost-factory"
        label={t("costs.factoryLabel")}
        value={factory}
        onChange={setFactory}
        disabled={pending}
        invalid={factoryCents === undefined}
      />
      <CostField
        id="cost-bath"
        label={t("costs.bathLabel")}
        value={bath}
        onChange={setBath}
        disabled={pending}
        invalid={bathCents === undefined}
      />
      <p className="text-xs text-muted-foreground">{t("costs.emptyHint")}</p>
      {error && (
        <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={pending}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={pending || factoryCents === undefined || bathCents === undefined}
        >
          {pending ? t("common.saving") : t("costs.save")}
        </Button>
      </div>
    </form>
  );
}
