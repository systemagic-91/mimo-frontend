import { apiRequest, buildQueryString } from "./http";
import { toBackendConsignmentStatus } from "./mappers";
import type {
  ConsignmentDto,
  ConsignmentDetailsDto,
  ConsignmentListItem,
  ConsignmentStatus,
  CreateConsignmentRequest,
  PageEnvelope,
  PageRequest,
} from "./types";

export interface ConsignmentListParams extends PageRequest {
  status?: ConsignmentStatus;
  sellerId?: string;
  overdue?: boolean;
}

export interface ItemActionOptions {
  /** Instante ISO da venda/devolução, para prestações de contas atrasadas. */
  at?: string;
  note?: string;
}

function itemActionBody(dateField: "soldAt" | "returnedAt", { at, note }: ItemActionOptions) {
  return { ...(at ? { [dateField]: at } : {}), ...(note ? { note } : {}) };
}

export const consignmentsApi = {
  list(params: ConsignmentListParams = {}, signal?: AbortSignal) {
    return apiRequest<PageEnvelope<ConsignmentListItem>>(
      `/consignments${buildQueryString({
        ...params,
        status: params.status ? toBackendConsignmentStatus(params.status) : undefined,
        sort: params.sort,
      })}`,
      { signal },
    );
  },

  get(id: string, signal?: AbortSignal) {
    return apiRequest<ConsignmentDetailsDto>(
      `/consignments/${encodeURIComponent(id)}`,
      { signal },
    );
  },

  forSeller(
    sellerId: string,
    params: PageRequest & { status?: ConsignmentStatus } = {},
    signal?: AbortSignal,
  ) {
    return apiRequest<PageEnvelope<ConsignmentDto>>(
      `/sellers/${encodeURIComponent(sellerId)}/consignments${buildQueryString({
        ...params,
        status: params.status ? toBackendConsignmentStatus(params.status) : undefined,
        sort: params.sort,
      })}`,
      { signal },
    );
  },

  create(input: CreateConsignmentRequest, idempotencyKey: string) {
    return apiRequest<ConsignmentDetailsDto>("/consignments", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: input,
    });
  },

  /** Sem `options.at`, o servidor usa o horário atual. Com data, ela precisa estar entre a entrega e agora. */
  markSold(consignmentId: string, pieceId: string, options: ItemActionOptions = {}) {
    return apiRequest<ConsignmentDetailsDto>(
      `/consignments/${encodeURIComponent(consignmentId)}/items/${encodeURIComponent(pieceId)}/sold`,
      { method: "POST", body: itemActionBody("soldAt", options) },
    );
  },

  markReturned(consignmentId: string, pieceId: string, options: ItemActionOptions = {}) {
    return apiRequest<ConsignmentDetailsDto>(
      `/consignments/${encodeURIComponent(consignmentId)}/items/${encodeURIComponent(pieceId)}/returned`,
      { method: "POST", body: itemActionBody("returnedAt", options) },
    );
  },
};
