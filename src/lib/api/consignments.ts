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

  markSold(consignmentId: string, pieceId: string, note?: string) {
    return apiRequest<ConsignmentDetailsDto>(
      `/consignments/${encodeURIComponent(consignmentId)}/items/${encodeURIComponent(pieceId)}/sold`,
      { method: "POST", body: note ? { note } : {} },
    );
  },

  markReturned(consignmentId: string, pieceId: string, note?: string) {
    return apiRequest<ConsignmentDetailsDto>(
      `/consignments/${encodeURIComponent(consignmentId)}/items/${encodeURIComponent(pieceId)}/returned`,
      { method: "POST", body: note ? { note } : {} },
    );
  },
};
