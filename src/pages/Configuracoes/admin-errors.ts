import { ApiError } from "@/lib/api/http";

const CODE_MESSAGES: Record<string, string> = {
  SELLER_NOT_FOUND: "Esta vendedora não foi encontrada. Atualize a lista e tente de novo.",
  FORBIDDEN: "Apenas sócios(as) podem alterar vendedoras e parâmetros.",
  IDEMPOTENCY_IN_PROGRESS: "Este envio ainda está sendo processado. Aguarde um instante.",
  IDEMPOTENCY_KEY_REUSED: "Os dados mudaram durante o envio. Confira e envie de novo.",
  RATE_LIMITED: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  INVALID_PAGINATION: "Filtro ou ordenação inválidos. Limpe os filtros e tente de novo.",
};

const FIELD_MESSAGES: Record<string, string> = {
  name: "Informe um nome com até 120 caracteres.",
  phone: "Informe um telefone com até 40 caracteres.",
  commissionRate: "Escolha uma comissão dentro da faixa permitida.",
  status: "Escolha um status válido.",
  defaultCommissionRate: "Escolha uma comissão padrão dentro da faixa permitida.",
  paymentTerms: "Marque pelo menos um prazo de pagamento (30, 60 ou 90 dias).",
  defaultConsignmentDays: "O prazo da consignação precisa ser de pelo menos 1 dia.",
  timezone: "Escolha um fuso horário válido.",
  q: "A busca pode ter no máximo 120 caracteres.",
};

/** Erros de campo de um `400 VALIDATION_ERROR`, já com mensagem, para mostrar junto a cada campo. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") return {};
  const errors: Record<string, string> = {};
  for (const [field, value] of Object.entries(error.fields ?? {})) {
    errors[field] =
      FIELD_MESSAGES[field] ?? (typeof value === "string" ? value : "Valor inválido.");
  }
  return errors;
}

/** Mensagem compreensível para os erros de `/sellers` e `/settings` (BACK_06). */
export function getAdminErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Não foi possível concluir a operação.";
  const known = CODE_MESSAGES[error.code];
  if (known) return known;
  if (error.status === 403) return CODE_MESSAGES.FORBIDDEN;
  if (error.code === "VALIDATION_ERROR") {
    const messages = Object.values(getFieldErrors(error));
    return messages.length ? messages.join(" ") : "Confira os dados informados.";
  }
  if (error.status === 0 || error.status === 408) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.";
  }
  if (error.status >= 500) {
    return "O servidor não conseguiu concluir a operação. Tente de novo em instantes.";
  }
  return error.detail || "Não foi possível concluir a operação.";
}
