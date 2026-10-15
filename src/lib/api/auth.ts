import { apiRequest, authTokenStore } from "./http";
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
      throw new Error("No in-memory refresh token is available.");
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
    const refreshToken = authTokenStore.getRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest<void>("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          retryOnUnauthorized: false,
          notifyUnauthorized: false,
        });
      }
    } finally {
      authTokenStore.clear();
    }
  },
};

