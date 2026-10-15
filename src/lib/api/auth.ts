import { ApiError, apiRequest, authTokenStore } from "./http";
import type {
  AuthResponse,
  AuthSessionResponse,
} from "./types";

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      authenticated: false,
      retryOnUnauthorized: false,
      notifyUnauthorized: false,
    });
    authTokenStore.set(response);
    return response;
  },

  async me(signal?: AbortSignal): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>("/auth/me", { signal });
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken = authTokenStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token is available for this browser session.");
    }
    const response = await apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      authenticated: false,
      retryOnUnauthorized: false,
      notifyUnauthorized: false,
    });
    authTokenStore.set(response);
    return response;
  },

  async logout(): Promise<void> {
    try {
      if (authTokenStore.getRefreshToken()) {
        const revokeSession = async () => {
          const refreshToken = authTokenStore.getRefreshToken();
          if (!refreshToken) return;
          await apiRequest<void>("/auth/logout", {
            method: "POST",
            body: { refreshToken },
            retryOnUnauthorized: false,
            notifyUnauthorized: false,
          });
        };

        try {
          await revokeSession();
        } catch (error) {
          if (
            !(error instanceof ApiError) ||
            error.status !== 401 ||
            !authTokenStore.getRefreshToken()
          ) {
            throw error;
          }
          await authApi.refresh();
          await revokeSession();
        }
      }
    } finally {
      authTokenStore.clear();
    }
  },
};
