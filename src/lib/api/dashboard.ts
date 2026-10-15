import { apiRequest } from "./http";
import type { DashboardResponse } from "./types";

export const dashboardApi = {
  get(signal?: AbortSignal) {
    return apiRequest<DashboardResponse>("/dashboard", { signal });
  },
};

