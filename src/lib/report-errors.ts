import { ApiError } from "@/lib/api/http";

/** Mensagem compreensível para os erros do dashboard e dos relatórios (BACK_09). */
export function getReportErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Não foi possível carregar os dados.";
  if (error.status === 403) return "Apenas sócios(as) podem ver o dashboard e os relatórios.";
  if (error.code === "VALIDATION_ERROR") {
    const fields = error.fields ?? {};
    if ("period" in fields) return "O período precisa começar antes de terminar e ter no máximo 366 dias.";
    if ("days" in fields) return "Os dias parados precisam estar entre 1 e 3650.";
    return "Confira os filtros informados.";
  }
  if (error.code === "INVALID_REQUEST") return "Informe as duas datas do período.";
  if (error.status === 0 || error.status === 408) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.";
  }
  if (error.status >= 500) {
    return "O servidor não conseguiu carregar os dados. Tente de novo em instantes.";
  }
  return error.detail || "Não foi possível carregar os dados.";
}
