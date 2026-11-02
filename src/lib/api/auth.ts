import {
  ApiError,
  apiRequest,
  authTokenStore,
  refreshSession,
  withSessionLock,
} from "./http";
import type {
  AuthResponse,
  AuthSessionResponse,
  ChangePasswordRequest,
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

  /**
   * Troca a própria senha. Sem a renovação automática do cliente: o `401 INVALID_CREDENTIALS` de senha
   * atual errada deve virar mensagem no formulário, não logout. Só um access token vencido renova e repete.
   * O `204` revoga todas as sessões (inclusive esta) e apaga o cookie; quem chama encerra a sessão no front.
   */
  async changePassword(input: ChangePasswordRequest): Promise<void> {
    const send = () =>
      apiRequest<void>("/auth/change-password", {
        method: "POST",
        body: input,
        retryOnUnauthorized: false,
        notifyUnauthorized: false,
      });
    try {
      await send();
    } catch (error) {
      const expiredSession =
        error instanceof ApiError &&
        error.status === 401 &&
        error.code !== "INVALID_CREDENTIALS";
      if (!expiredSession || !(await refreshSession())) throw error;
      await send();
    }
    authTokenStore.clear();
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
