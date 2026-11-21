import { ApiError } from "@/lib/api/http";

const CODE_MESSAGES: Record<string, string> = {
  EMPTY_ITEMS: "Escolha pelo menos uma peça.",
  DUE_DATE_IN_PAST: "O vencimento não pode ser antes de hoje.",
  SELLER_INACTIVE: "Esta vendedora está inativa e não pode receber lotes novos. Escolha outra.",
  SELLER_NOT_FOUND: "Esta vendedora não foi encontrada. Escolha outra.",
  PIECE_NOT_FOUND: "Algumas peças não existem mais. Elas foram tiradas da seleção.",
  PIECE_NOT_AVAILABLE: "Algumas peças não estão mais disponíveis. Elas foram tiradas da seleção.",
  PIECE_STATE_INCONSISTENT:
    "Uma das peças está com o estado inconsistente no sistema. Avise o suporte e tente sem ela.",
  CONSIGNMENT_NOT_FOUND: "Este lote não foi encontrado. Atualize a página.",
  CONSIGNMENT_ITEM_NOT_FOUND: "Esta peça não faz parte do lote. Atualize a página.",
  ITEM_NOT_WITH_SELLER: "Esta peça já foi vendida ou devolvida por outra pessoa. O lote foi recarregado.",
  FORBIDDEN: "Você não tem permissão para ver estas informações.",
  IDEMPOTENCY_IN_PROGRESS: "Este envio ainda está sendo processado. Aguarde um instante.",
  IDEMPOTENCY_KEY_REUSED: "Os dados mudaram durante o envio. Confira e envie de novo.",
  INVALID_PAGINATION: "Filtro ou ordenação inválidos. Limpe os filtros e tente de novo.",
};

const FIELD_MESSAGES: Record<string, string> = {
  sellerId: "Escolha uma vendedora.",
  pieceIds: "Confira as peças escolhidas.",
  dueDate: "O vencimento precisa estar entre hoje e daqui a 365 dias.",
  paymentTermDays: "Escolha um dos prazos de pagamento permitidos.",
  note: "A observação está longa demais.",
  soldAt: "A data precisa estar entre a entrega do lote e hoje.",
  returnedAt: "A data precisa estar entre a entrega do lote e hoje.",
  period: "O início do período precisa ser antes do fim.",
};

/** Campos com erro num `400 VALIDATION_ERROR`, já com a mensagem. */
export function getConsignmentFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") return {};
  const errors: Record<string, string> = {};
  for (const field of Object.keys(error.fields ?? {})) {
    errors[field] = FIELD_MESSAGES[field] ?? "Valor inválido.";
  }
  return errors;
}

/** IDs de peças citados em `fields.pieceIds` (peças inexistentes ou indisponíveis). */
export function getProblemPieceIds(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const ids = error.fields?.pieceIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

/** Mensagem compreensível para os erros de consignação e da vendedora (BACK_06/BACK_08/BACK_27). */
export function getConsignmentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Não foi possível concluir a operação.";
  // A mensagem do backend cita os códigos das peças indisponíveis.
  if (error.code === "PIECE_NOT_AVAILABLE" && error.detail) return error.detail;
  const known = CODE_MESSAGES[error.code];
  if (known) return known;
  if (error.status === 403) return CODE_MESSAGES.FORBIDDEN;
  if (error.code === "VALIDATION_ERROR") {
    const messages = Object.values(getConsignmentFieldErrors(error));
    return messages.length ? [...new Set(messages)].join(" ") : "Confira os dados informados.";
  }
  if (error.status === 0 || error.status === 408) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.";
  }
  if (error.status >= 500) {
    return "O servidor não conseguiu concluir a operação. Tente de novo em instantes.";
  }
  return error.detail || "Não foi possível concluir a operação.";
}
