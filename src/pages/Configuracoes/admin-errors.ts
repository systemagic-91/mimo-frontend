import { apiErrorMessage, apiFieldErrors } from "@/lib/api-errors";

const FIELDS: Record<string, string> = {
  name: "settings.field.name",
  phone: "settings.field.phone",
  commissionRate: "settings.field.commissionRate",
  status: "settings.field.status",
  defaultCommissionRate: "settings.field.defaultCommissionRate",
  paymentTerms: "settings.field.paymentTerms",
  defaultConsignmentDays: "settings.field.defaultConsignmentDays",
  timezone: "settings.field.timezone",
  q: "common.field.q",
};

/** Erros de campo de um `400 VALIDATION_ERROR`, já com mensagem, para mostrar junto a cada campo. */
export function getFieldErrors(error: unknown): Record<string, string> {
  return apiFieldErrors(error, FIELDS);
}

/** Mensagem compreensível para os erros de `/sellers` e `/settings` (BACK_06). */
export function getAdminErrorMessage(error: unknown): string {
  return apiErrorMessage(error, { codes: { FORBIDDEN: "settings.error.forbidden" }, fields: FIELDS });
}
