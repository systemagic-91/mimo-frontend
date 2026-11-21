import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { CostField } from "@/components/cost-field";
import { Button } from "@/components/ui/button";
import { useUpdatePieceCostsMutation } from "@/lib/api/hooks";
import type { PieceDto, UpdatePieceCostsRequest } from "@/lib/api/types";
import { formatCents } from "@/lib/format";
import { centsToInputValue, getPieceErrorMessage, parseCostToCents } from "@/lib/piece-errors";

function costLabel(cents: number | null | undefined): string {
  return cents == null ? "não informado" : formatCents(cents);
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
          toast.success("Custos atualizados");
        },
        onError: (cause) => setError(getPieceErrorMessage(cause)),
      },
    );
  };

  if (!editing) {
    return (
      <div className="mt-4 space-y-2.5 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">Custos</h4>
          <Button variant="ghost" size="sm" className="h-7" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5" />
            Editar custos
          </Button>
        </div>
        <CostRow label="Fábrica" cents={piece.factoryCostCents} />
        <CostRow label="Banho" cents={piece.bathCostCents} />
        <CostRow label="Total" cents={piece.totalCostCents} />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4" noValidate>
      <h4 className="text-sm font-medium text-foreground">Editar custos</h4>
      <CostField
        id="cost-factory"
        label="Custo da fábrica (R$)"
        value={factory}
        onChange={setFactory}
        disabled={pending}
        invalid={factoryCents === undefined}
      />
      <CostField
        id="cost-bath"
        label="Custo do banho (R$)"
        value={bath}
        onChange={setBath}
        disabled={pending}
        invalid={bathCents === undefined}
      />
      <p className="text-xs text-muted-foreground">Deixe vazio para marcar como não informado.</p>
      {error && (
        <p role="alert" className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={pending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={pending || factoryCents === undefined || bathCents === undefined}
        >
          {pending ? "Salvando…" : "Salvar custos"}
        </Button>
      </div>
    </form>
  );
}
