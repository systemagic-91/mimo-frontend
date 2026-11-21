import { apiErrorMessage } from "@/lib/api-errors";

/** Mensagem compreensível para os erros do dashboard e dos relatórios (BACK_09). */
export function getReportErrorMessage(error: unknown): string {
  return apiErrorMessage(error, {
    codes: {
      FORBIDDEN: "reports.error.forbidden",
      INVALID_REQUEST: "reports.error.invalidRequest",
      INTERNAL_ERROR: "reports.error.server",
    },
    fields: { period: "reports.field.period", days: "reports.field.days" },
    fallback: "common.loadError",
  });
}
