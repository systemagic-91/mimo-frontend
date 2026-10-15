import { apiRequest, buildQueryString } from "./http";
import { toBackendPieceStage } from "./mappers";
import type {
  BackendPieceStage,
  PageEnvelope,
  PageRequest,
  PieceDto,
  PieceEventDto,
  PieceStage,
  ReceivePieceResponse,
  ReceivePieceRequest,
  LabelPieceRequest,
  UploadPiecePhotoResponse,
} from "./types";

export interface PieceListParams extends PageRequest {
  q?: string;
  status?: PieceStage;
}

export const piecesApi = {
  list(params: PieceListParams = {}, signal?: AbortSignal) {
    return apiRequest<PageEnvelope<PieceDto> & { totalValueCents?: number }>(
      `/pieces${buildQueryString({
        ...params,
        status: params.status ? toBackendPieceStage(params.status) : undefined,
        sort: params.sort,
      })}`,
      { signal },
    );
  },

  get(id: string, signal?: AbortSignal) {
    return apiRequest<PieceDto>(`/pieces/${encodeURIComponent(id)}`, { signal });
  },

  events(id: string, signal?: AbortSignal) {
    return apiRequest<PieceEventDto[]>(
      `/pieces/${encodeURIComponent(id)}/events`,
      { signal },
    );
  },

  nextCode(signal?: AbortSignal) {
    return apiRequest<{ code: string }>("/pieces/next-code", { signal });
  },

  receive(
    input: Omit<ReceivePieceRequest, "stage"> & {
      stage: Extract<PieceStage, "fabrica" | "banho_ouro">;
    },
  ) {
    const body: ReceivePieceRequest = {
      ...input,
      stage: toBackendPieceStage(input.stage),
    };
    return apiRequest<ReceivePieceResponse>("/pieces/receive", {
      method: "POST",
      body,
    });
  },

  label(input: LabelPieceRequest) {
    return apiRequest<PieceDto>("/pieces/label", {
      method: "POST",
      body: input,
    });
  },

  async uploadPhoto(file: File): Promise<UploadPiecePhotoResponse> {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<UploadPiecePhotoResponse>("/uploads/piece-photo", {
      method: "POST",
      body: form,
    });
  },
};

export type { BackendPieceStage };
