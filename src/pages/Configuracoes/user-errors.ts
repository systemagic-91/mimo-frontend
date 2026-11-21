import { apiErrorMessage } from "@/lib/api-errors";

export const TEMPORARY_PASSWORD_MIN = 12;
export const TEMPORARY_PASSWORD_MAX = 72;

/** Mensagem compreensível para os erros de `/users` (BACK_19). */
export function getUserErrorMessage(error: unknown): string {
  return apiErrorMessage(error, {
    codes: { FORBIDDEN: "users.error.forbidden" },
    fields: {
      name: "users.field.name",
      email: "users.field.email",
      role: "users.field.role",
      temporaryPassword: "users.field.temporaryPassword",
    },
  });
}
