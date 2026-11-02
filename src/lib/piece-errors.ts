import { ApiError } from "@/lib/api/http";
import { moneyToCents } from "@/lib/api/mappers";

const CODE_MESSAGES: Record<string, string> = {
  INVALID_INITIAL_STAGE: "A peça só pode ser recebida na fábrica ou no banho de ouro.",
  PIECE_NOT_FOUND: "Esta peça não foi encontrada. Atualize a lista e tente de novo.",
  PHOTO_NOT_FOUND: "A foto enviada não está mais disponível. Envie a foto de novo.",
  INVALID_PIECE_TRANSITION:
    "Esta peça não está mais no banho de ouro (talvez já tenha sido etiquetada). Escolha outra peça.",
  PHOTO_TOO_LARGE: "A foto passou de 1 MB. Escolha uma imagem menor.",
  UNSUPPORTED_MEDIA_TYPE: "Formato de envio não aceito. Escolha uma foto JPEG, PNG ou WebP.",
  RATE_LIMITED: "Muitos envios em pouco tempo. Aguarde um minuto e tente de novo.",
  IDEMPOTENCY_IN_PROGRESS: "Este envio ainda está sendo processado. Aguarde um instante.",
  IDEMPOTENCY_KEY_REUSED: "Os dados mudaram durante o envio. Confira e envie de novo.",
  CONFLICT: "A peça foi alterada por outra pessoa. Atualize e tente de novo.",
  INVALID_PAGINATION: "Filtro ou ordenação inválidos. Limpe os filtros e tente de novo.",
};

const FIELD_MESSAGES: Record<string, string> = {
  type: "Escolha um tipo de peça válido.",
  valueCents: "Informe um valor maior que zero.",
  stage: "Escolha onde a peça chegou.",
  note: "A observação pode ter no máximo 500 caracteres.",
  file: "A foto precisa ser JPEG, PNG ou WebP, com até 2000×2000 px.",
  q: "A busca pode ter no máximo 120 caracteres.",
};

/** Mensagem compreensível para os erros de peças e fotos (BACK_05/BACK_07). */
export function getPieceErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Não foi possível concluir a operação.";
  const known = CODE_MESSAGES[error.code];
  if (known) return known;
  if (error.code === "VALIDATION_ERROR") {
    const messages = Object.keys(error.fields ?? {})
      .map((field) => FIELD_MESSAGES[field])
      .filter(Boolean);
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

/** Formata centavos para o campo de valor ("84,90"). */
export function centsToInputValue(valueCents: number): string {
  return (valueCents / 100).toFixed(2).replace(".", ",");
}
