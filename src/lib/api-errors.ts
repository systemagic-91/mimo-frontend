import i18n from "@/i18n/config";
import { ApiError } from "@/lib/api/http";

/**
 * Mensagens dos erros da API, sempre pelo `code` (estável), nunca pelo texto. O `detail` do backend só
 * aparece quando o código é desconhecido. Cada área pode trocar a mensagem de um código ou de um campo
 * pelo texto do seu contexto (por exemplo, "escolha outra vendedora" no wizard).
 */
const CODE_KEYS: Record<string, string> = {
  INVALID_REQUEST: "apiError.INVALID_REQUEST",
  VALIDATION_ERROR: "apiError.VALIDATION_ERROR",
  INVALID_PAGINATION: "apiError.INVALID_PAGINATION",
  INVALID_IDEMPOTENCY_KEY: "apiError.INVALID_IDEMPOTENCY",
  INVALID_IDEMPOTENCY_SCOPE: "apiError.INVALID_IDEMPOTENCY",
  INVALID_IDEMPOTENCY_PAYLOAD: "apiError.INVALID_IDEMPOTENCY",
  PASSWORD_UNCHANGED: "apiError.PASSWORD_UNCHANGED",
  UNAUTHENTICATED: "apiError.SESSION_ENDED",
  INVALID_CREDENTIALS: "apiError.INVALID_CREDENTIALS",
  INVALID_REFRESH_TOKEN: "apiError.SESSION_ENDED",
  INVALID_ACCESS_TOKEN: "apiError.SESSION_ENDED",
  FORBIDDEN: "apiError.FORBIDDEN",
  USER_INACTIVE: "apiError.USER_INACTIVE",
  PASSWORD_CHANGE_REQUIRED: "apiError.PASSWORD_CHANGE_REQUIRED",
  ORIGIN_NOT_ALLOWED: "apiError.ORIGIN_NOT_ALLOWED",
  NOT_FOUND: "apiError.NOT_FOUND",
  PIECE_NOT_FOUND: "apiError.PIECE_NOT_FOUND",
  SELLER_NOT_FOUND: "apiError.SELLER_NOT_FOUND",
  PHOTO_NOT_FOUND: "apiError.PHOTO_NOT_FOUND",
  CONSIGNMENT_NOT_FOUND: "apiError.CONSIGNMENT_NOT_FOUND",
  CONSIGNMENT_ITEM_NOT_FOUND: "apiError.CONSIGNMENT_ITEM_NOT_FOUND",
  USER_NOT_FOUND: "apiError.USER_NOT_FOUND",
  CONFLICT: "apiError.CONFLICT",
  INVALID_PIECE_TRANSITION: "apiError.INVALID_PIECE_TRANSITION",
  PIECE_NOT_AVAILABLE: "apiError.PIECE_NOT_AVAILABLE",
  ITEM_NOT_WITH_SELLER: "apiError.ITEM_NOT_WITH_SELLER",
  PIECE_STATE_INCONSISTENT: "apiError.PIECE_STATE_INCONSISTENT",
  IDEMPOTENCY_KEY_REUSED: "apiError.IDEMPOTENCY_KEY_REUSED",
  IDEMPOTENCY_IN_PROGRESS: "apiError.IDEMPOTENCY_IN_PROGRESS",
  EMAIL_ALREADY_USED: "apiError.EMAIL_ALREADY_USED",
  PHOTO_TOO_LARGE: "apiError.PHOTO_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "apiError.UNSUPPORTED_MEDIA_TYPE",
  INVALID_INITIAL_STAGE: "apiError.INVALID_INITIAL_STAGE",
  SELLER_INACTIVE: "apiError.SELLER_INACTIVE",
  EMPTY_ITEMS: "apiError.EMPTY_ITEMS",
  DUE_DATE_IN_PAST: "apiError.DUE_DATE_IN_PAST",
  LAST_OWNER: "apiError.LAST_OWNER",
  CANNOT_DEACTIVATE_SELF: "apiError.CANNOT_DEACTIVATE_SELF",
  CANNOT_CHANGE_OWN_ROLE: "apiError.CANNOT_CHANGE_OWN_ROLE",
  CANNOT_RESET_OWN_PASSWORD: "apiError.CANNOT_RESET_OWN_PASSWORD",
  RATE_LIMITED: "apiError.RATE_LIMITED",
  INTERNAL_ERROR: "apiError.INTERNAL_ERROR",
  NETWORK_ERROR: "apiError.NETWORK_ERROR",
  REQUEST_TIMEOUT: "apiError.NETWORK_ERROR",
  INVALID_RESPONSE: "apiError.INVALID_RESPONSE",
};

export interface ApiErrorContext {
  /** Chave de mensagem por código, para o texto do contexto. */
  codes?: Record<string, string>;
  /** Chave de mensagem por campo de `fields` num `400 VALIDATION_ERROR`. */
  fields?: Record<string, string>;
  /** Chave usada quando o erro nem é da API. */
  fallback?: string;
}

/** Mensagem de cada campo com erro num `400 VALIDATION_ERROR`, para mostrar junto ao campo. */
export function apiFieldErrors(error: unknown, fields: Record<string, string> = {}): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") return {};
  const result: Record<string, string> = {};
  for (const field of Object.keys(error.fields ?? {})) {
    result[field] = i18n.t(fields[field] ?? "apiError.field.invalid");
  }
  return result;
}

/** Mensagem compreensível para qualquer erro de chamada à API. */
export function apiErrorMessage(error: unknown, context: ApiErrorContext = {}): string {
  const fallback = context.fallback ?? "apiError.generic";
  if (!(error instanceof ApiError)) return i18n.t(fallback);
  const contextual = context.codes?.[error.code];
  if (contextual) return i18n.t(contextual);
  if (error.code === "VALIDATION_ERROR") {
    const messages = Object.values(apiFieldErrors(error, context.fields));
    return messages.length ? [...new Set(messages)].join(" ") : i18n.t(CODE_KEYS.VALIDATION_ERROR);
  }
  const known = CODE_KEYS[error.code];
  if (known) return i18n.t(known);
  if (error.status === 0 || error.status === 408) return i18n.t(CODE_KEYS.NETWORK_ERROR);
  if (error.status === 403) return i18n.t(CODE_KEYS.FORBIDDEN);
  if (error.status >= 500) return i18n.t(CODE_KEYS.INTERNAL_ERROR);
  // Resposta de erro sem JSON (`HTTP_ERROR`): o corpo pode ser HTML de proxy, então não vai para a tela.
  if (error.code === "HTTP_ERROR") return i18n.t(fallback);
  return error.detail || i18n.t(fallback);
}
