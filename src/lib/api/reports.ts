import { apiRequest, buildQueryString } from "./http";
import type {
  OverdueReportResponse,
  StalePiecesReportResponse,
  TurnoverReportResponse,
} from "./types";

export const reportsApi = {
  turnover(from: string, to: string, signal?: AbortSignal) {
    return apiRequest<TurnoverReportResponse>(
      `/reports/turnover${buildQueryString({ from, to })}`,
      { signal },
    );
  },

  overdue(signal?: AbortSignal) {
    return apiRequest<OverdueReportResponse>("/reports/overdue", { signal });
  },

  stalePieces(days = 60, signal?: AbortSignal) {
    return apiRequest<StalePiecesReportResponse>(
      `/reports/stale-pieces${buildQueryString({ days })}`,
      { signal },
    );
  },
};
