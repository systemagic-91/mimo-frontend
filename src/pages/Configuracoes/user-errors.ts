import { ApiError } from "@/lib/api/http";

export const TEMPORARY_PASSWORD_MIN = 12;
export const TEMPORARY_PASSWORD_MAX = 72;

const CODE_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_USED: "Já existe um usuário com este e-mail.",
  LAST_OWNER:
    "A loja precisa de pelo menos um(a) sócio(a) ativo(a). Torne outra pessoa sócia antes de fazer esta mudança.",
  CANNOT_DEACTIVATE_SELF: "Você não pode desativar a sua própria conta.",
  CANNOT_CHANGE_OWN_ROLE: "Você não pode mudar o seu próprio papel.",
  CANNOT_RESET_OWN_PASSWORD:
    "Para mudar a sua própria senha, use “Trocar senha” no menu.",
  USER_NOT_FOUND: "Este usuário não foi encontrado. Atualize a lista e tente de novo.",
  FORBIDDEN: "Apenas sócios(as) podem gerenciar usuários.",
  IDEMPOTENCY_IN_PROGRESS: "Este envio ainda está sendo processado. Aguarde um instante.",
  RATE_LIMITED: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
};

const FIELD_MESSAGES: Record<string, string> = {
  name: "Informe um nome com até 120 caracteres.",
  email: "Informe um e-mail válido.",
  role: "Escolha um papel válido.",
  temporaryPassword: `A senha temporária precisa ter de ${TEMPORARY_PASSWORD_MIN} a ${TEMPORARY_PASSWORD_MAX} caracteres.`,
};

/** Mensagem compreensível para os erros de `/users` (BACK_19). */
export function getUserErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Não foi possível concluir a operação.";
  const known = CODE_MESSAGES[error.code];
  if (known) return known;
  if (error.code === "VALIDATION_ERROR") {
    const fieldMessages = Object.keys(error.fields ?? {})
      .map((field) => FIELD_MESSAGES[field])
      .filter(Boolean);
    return fieldMessages.length
      ? fieldMessages.join(" ")
      : "Confira os dados informados.";
  }
  if (error.status === 0 || error.status === 408) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }
  return error.detail || "Não foi possível concluir a operação.";
}
