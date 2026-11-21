import { apiErrorMessage, apiFieldErrors } from "@/lib/api-errors";
import { ApiError } from "@/lib/api/http";

const FIELDS: Record<string, string> = {
  sellerId: "consignment.field.sellerId",
  pieceIds: "consignment.field.pieceIds",
  dueDate: "consignment.field.dueDate",
  paymentTermDays: "consignment.field.paymentTermDays",
  note: "consignment.field.note",
  soldAt: "consignment.field.itemDate",
  returnedAt: "consignment.field.itemDate",
  period: "consignment.field.period",
};

/** Campos com erro num `400 VALIDATION_ERROR`, já com a mensagem. */
export function getConsignmentFieldErrors(error: unknown): Record<string, string> {
  return apiFieldErrors(error, FIELDS);
}

/** IDs de peças citados em `fields.pieceIds` (peças inexistentes ou indisponíveis). */
export function getProblemPieceIds(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const ids = error.fields?.pieceIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

/** Mensagem compreensível para os erros de consignação e da vendedora (BACK_06/BACK_08/BACK_27). */
export function getConsignmentErrorMessage(error: unknown): string {
  // A mensagem do backend cita os códigos das peças indisponíveis.
  if (error instanceof ApiError && error.code === "PIECE_NOT_AVAILABLE" && error.detail) return error.detail;
  return apiErrorMessage(error, {
    codes: {
      PIECE_NOT_FOUND: "consignment.error.pieceNotFound",
      PIECE_NOT_AVAILABLE: "consignment.error.pieceNotAvailable",
      SELLER_NOT_FOUND: "consignment.error.sellerNotFound",
      FORBIDDEN: "consignment.error.forbidden",
    },
    fields: FIELDS,
  });
}
