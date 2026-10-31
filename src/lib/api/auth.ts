import {
  apiRequest,
  authTokenStore,
  refreshSession,
  withSessionLock,
} from "./http";
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

  /** Restaura a sessão a partir do cookie HttpOnly. `null` quando não existe sessão. */
  refresh(): Promise<AuthResponse | null> {
    return refreshSession<AuthResponse>();
  },

  async logout(): Promise<void> {
    try {
      await withSessionLock(() =>
        apiRequest<void>("/auth/logout", {
          method: "POST",
          authenticated: false,
          retryOnUnauthorized: false,
          notifyUnauthorized: false,
        }),
      );
    } finally {
      authTokenStore.clear();
    }
  },
};
