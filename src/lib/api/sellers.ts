import { apiRequest, buildQueryString } from "./http";
import { toBackendSellerStatus } from "./mappers";
import type {
  CreateSellerRequest,
  PageEnvelope,
  PageRequest,
  PaymentScheduleResponse,
  SellerCommissionDto,
  SellerDto,
  SellerListItem,
  SellerStatsDto,
  SellerStatus,
  UpdateSellerRequest,
} from "./types";

export interface SellerListParams extends PageRequest {
  q?: string;
  status?: SellerStatus;
}

export const sellersApi = {
  list(params: SellerListParams = {}, signal?: AbortSignal) {
    return apiRequest<PageEnvelope<SellerListItem>>(
      `/sellers${buildQueryString({
        ...params,
        status: params.status ? toBackendSellerStatus(params.status) : undefined,
        sort: params.sort,
      })}`,
      { signal },
    );
  },

  get(id: string, signal?: AbortSignal) {
    return apiRequest<SellerDto>(`/sellers/${encodeURIComponent(id)}`, {
      signal,
    });
  },

  create(input: CreateSellerRequest, idempotencyKey: string) {
    return apiRequest<SellerDto>("/sellers", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: input,
    });
  },

  update(id: string, input: UpdateSellerRequest) {
    const body = input.status
      ? { ...input, status: toBackendSellerStatus(input.status) }
      : input;
    return apiRequest<SellerDto>(`/sellers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  },

  stats(id: string, signal?: AbortSignal) {
    return apiRequest<SellerStatsDto>(
      `/sellers/${encodeURIComponent(id)}/stats`,
      { signal },
    );
  },

  commission(id: string, from: string, to: string, signal?: AbortSignal) {
    return apiRequest<SellerCommissionDto>(
      `/sellers/${encodeURIComponent(id)}/commission${buildQueryString({ from, to })}`,
      { signal },
    );
  },

  /** Só owner. `from`/`to` são datas locais inclusivas da loja, pela data da venda (BACK_27). */
  paymentSchedule(id: string, from: string, to: string, signal?: AbortSignal) {
    return apiRequest<PaymentScheduleResponse>(
      `/sellers/${encodeURIComponent(id)}/payment-schedule${buildQueryString({ from, to })}`,
      { signal },
    );
  },
};
