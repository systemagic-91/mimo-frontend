import { apiRequest } from "./http";
import type { SettingsDto, UpdateSettingsRequest } from "./types";

export const settingsApi = {
  get(signal?: AbortSignal) {
    return apiRequest<SettingsDto>("/settings", { signal });
  },

  update(input: UpdateSettingsRequest) {
    return apiRequest<SettingsDto>("/settings", {
      method: "PATCH",
      body: input,
    });
  },
};

