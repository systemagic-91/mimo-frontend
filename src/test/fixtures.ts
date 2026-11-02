import type { PieceDto, PieceEventDto, PieceListResponse } from "@/lib/api/types";

/** URL base da API nos testes (`VITE_API_BASE_URL` do `vite.config.ts`). */
export const api = "http://localhost:8080/api/v1";

export function makePiece(
  overrides: Partial<PieceDto> & Pick<PieceDto, "id" | "code">,
): PieceDto {
  return {
    type: "Brinco",
    valueCents: 8490,
    status: "ETIQUETADA",
    currentLocation: "Estoque",
    photoUrl: null,
    note: null,
    factoryCostCents: null,
    bathCostCents: null,
    totalCostCents: null,
    createdAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-02T12:00:00Z",
    version: 0,
    ...overrides,
  };
}

export function makeEvent(
  overrides: Partial<PieceEventDto> & Pick<PieceEventDto, "id" | "pieceId" | "stage" | "occurredAt">,
): PieceEventDto {
  return { note: null, actorUserId: "user-1", ...overrides };
}

export function pieceList(
  items: PieceDto[],
  options: { total?: number; totalValueCents?: number; page?: number; totalPages?: number } = {},
): PieceListResponse {
  return {
    items,
    pagination: {
      page: options.page ?? 1,
      pageSize: 50,
      total: options.total ?? items.length,
      totalPages: options.totalPages ?? 1,
    },
    summary: {
      totalValueCents:
        options.totalValueCents ?? items.reduce((sum, item) => sum + item.valueCents, 0),
    },
  };
}
