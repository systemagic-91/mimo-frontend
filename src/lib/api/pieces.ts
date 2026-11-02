import { apiRequest, buildQueryString } from "./http";
import { toBackendPieceStage } from "./mappers";
import type {
  BackendPieceStage,
  PieceListResponse,
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
    return apiRequest<PieceListResponse>(
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

  // As mutations recebem a Idempotency-Key de quem chama: o formulário gera uma por envio e a reaproveita
  // no "tentar de novo", para um retry depois de falha de rede não criar a peça (ou a foto) duas vezes.
  receive(input: ReceivePieceInput, idempotencyKey: string) {
    const body: ReceivePieceRequest = {
      ...input,
      stage: toBackendPieceStage(input.stage),
    };
    return apiRequest<ReceivePieceResponse>("/pieces/receive", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body,
    });
  },

  label(input: LabelPieceRequest, idempotencyKey: string) {
    return apiRequest<PieceDto>("/pieces/label", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: input,
    });
  },

  async uploadPhoto(
    file: File,
    idempotencyKey: string,
  ): Promise<UploadPiecePhotoResponse> {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<UploadPiecePhotoResponse>("/uploads/piece-photo", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: form,
    });
  },
};

export type ReceivePieceInput = Omit<ReceivePieceRequest, "stage"> & {
  stage: Extract<PieceStage, "fabrica" | "banho_ouro">;
};

export type { BackendPieceStage };
