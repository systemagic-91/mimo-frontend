import { apiErrorMessage } from "@/lib/api-errors";
import { moneyToCents } from "@/lib/api/mappers";

/** Mensagem compreensível para os erros de peças, fotos e custos (BACK_05/BACK_07/BACK_23). */
export function getPieceErrorMessage(error: unknown): string {
  return apiErrorMessage(error, {
    codes: {
      RATE_LIMITED: "piece.error.rateLimited",
      FORBIDDEN: "piece.error.forbidden",
      CONFLICT: "piece.error.conflict",
    },
    fields: {
      type: "piece.field.type",
      valueCents: "piece.field.valueCents",
      stage: "piece.field.stage",
      note: "piece.field.note",
      file: "piece.field.file",
      q: "common.field.q",
      factoryCostCents: "piece.field.factoryCostCents",
      bathCostCents: "piece.field.bathCostCents",
    },
  });
}

/** Converte "99,90" ou "99.90" em centavos; `null` se não for um valor positivo com até 2 casas. */
export function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  try {
    const cents = moneyToCents(Number(normalized));
    return cents > 0 ? cents : null;
  } catch {
    return null;
  }
}

/**
 * Custo digitado em reais. Vazio é `null` ("não informado"); zero é um custo válido.
 * `undefined` quando o texto não é um valor com até 2 casas decimais.
 */
export function parseCostToCents(value: string): number | null | undefined {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  try {
    return moneyToCents(Number(normalized));
  } catch {
    return undefined;
  }
}

/** Formata centavos para o campo de valor ("84,90"). */
export function centsToInputValue(valueCents: number): string {
  return (valueCents / 100).toFixed(2).replace(".", ",");
}
