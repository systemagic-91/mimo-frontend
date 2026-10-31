export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  requestId?: string;
  fields?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly type?: string;
  readonly requestId?: string;
  readonly fields?: Record<string, unknown>;

  constructor(status: number, problem: ProblemDetail = {}) {
    const title = problem.title || "Falha na comunicação com o servidor.";
    const detail = problem.detail || title;
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = problem.code || "HTTP_ERROR";
    this.title = title;
    this.detail = detail;
    this.type = problem.type;
    this.requestId = problem.requestId;
    this.fields = problem.fields;
  }
}

// O refresh token vive só no cookie HttpOnly `luma_refresh`, que o JavaScript não lê.
export interface AuthTokens {
  accessToken: string;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
  notifyUnauthorized?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/+$/,
  "",
);
const REFRESH_LOCK_NAME = "luma-session-refresh";

let authTokens: AuthTokens | null = null;
let unauthorizedHandler: (() => void) | undefined;
let refreshPromise: Promise<RefreshedSession | null> | null = null;
let unauthorizedNotified = false;

function notifyUnauthorizedOnce() {
  if (unauthorizedNotified) return;
  unauthorizedNotified = true;
  unauthorizedHandler?.();
}

export const authTokenStore = {
  getAccessToken: () => authTokens?.accessToken ?? null,
  set: (tokens: AuthTokens) => {
    authTokens = { accessToken: tokens.accessToken };
    unauthorizedNotified = false;
  },
  clear: () => {
    authTokens = null;
  },
  setUnauthorizedHandler: (handler?: () => void) => {
    unauthorizedHandler = handler;
  },
};

function resolveUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export function buildQueryString(
  params: Record<
    string,
    string | number | boolean | readonly string[] | undefined
  >,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item));
    } else if (value !== undefined) {
      search.set(key, String(value));
    }
  });
  const result = search.toString();
  return result ? `?${result}` : "";
}

function makeProblem(status: number, value: unknown): ProblemDetail {
  if (!value || typeof value !== "object") return { status };
  const problem = value as ProblemDetail;
  return { ...problem, status: problem.status ?? status };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) {
    if (response.ok) return undefined as T;
    throw new ApiError(response.status, {
      title: response.statusText || "Falha na requisição.",
      code: "HTTP_ERROR",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (response.ok) {
      throw new ApiError(response.status, {
        title: "Resposta inválida do servidor.",
        code: "INVALID_RESPONSE",
      });
    }
    throw new ApiError(response.status, {
      title: response.statusText || "Falha na requisição.",
      detail: text,
      code: "HTTP_ERROR",
    });
  }

  if (!response.ok) {
    throw new ApiError(response.status, makeProblem(response.status, parsed));
  }
  return parsed as T;
}

async function performRequest<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<T> {
  const {
    body,
    headers: suppliedHeaders,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    authenticated = true,
    signal: externalSignal,
    ...requestOptions
  } = options;
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const headers = new Headers(suppliedHeaders);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated && authTokens?.accessToken) {
    headers.set("Authorization", `Bearer ${authTokens.accessToken}`);
  }

  try {
    const response = await fetch(resolveUrl(path), {
      ...requestOptions,
      credentials: "same-origin",
      headers,
      signal: controller.signal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
    return await parseResponse<T>(response);
  } catch (error) {
    if (timedOut) {
      throw new ApiError(408, {
        title: "A requisição excedeu o tempo limite.",
        code: "REQUEST_TIMEOUT",
      });
    }
    if (externalSignal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, {
      title: "Não foi possível conectar ao servidor.",
      detail: error instanceof Error ? error.message : "Erro de rede.",
      code: "NETWORK_ERROR",
    });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}

type RefreshedSession = AuthTokens & Record<string, unknown>;

// Todas as abas dividem o mesmo cookie. Se duas renovassem ao mesmo tempo, a segunda mandaria um token já
// trocado e o backend revogaria todas as sessões; a trava faz a outra aba esperar e já mandar o cookie novo.
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return action();
  return await navigator.locks.request(REFRESH_LOCK_NAME, action);
}

/** Renova a sessão pelo cookie. Devolve `null` quando não há sessão válida (`401`). */
export function refreshSession<T extends AuthTokens>(): Promise<T | null> {
  if (!refreshPromise) {
    refreshPromise = withSessionLock(() =>
      performRequest<RefreshedSession>("/auth/refresh", {
        method: "POST",
        authenticated: false,
      }),
    )
      .then((session) => {
        authTokenStore.set(session);
        return session;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          authTokenStore.clear();
          return null;
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise as Promise<T | null>;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    retryOnUnauthorized = true,
    notifyUnauthorized = true,
    ...requestOptions
  } = options;
  const tokenAtRequest = authTokens?.accessToken;
  const headers = new Headers(requestOptions.headers);
  const method = (requestOptions.method || "GET").toUpperCase();
  if (
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    !path.startsWith("/auth/") &&
    !headers.has("Idempotency-Key")
  ) {
    headers.set("Idempotency-Key", createIdempotencyKey());
  }
  const preparedOptions = { ...requestOptions, headers };

  try {
    return await performRequest<T>(path, preparedOptions);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      preparedOptions.authenticated === false
    ) {
      throw error;
    }
    const authEndpointWithoutRefresh = [
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
    ].includes(path);
    if (retryOnUnauthorized && !authEndpointWithoutRefresh) {
      const tokenChanged = Boolean(
        tokenAtRequest && authTokens?.accessToken && tokenAtRequest !== authTokens.accessToken,
      );
      const refreshed = tokenChanged || (await refreshSession()) !== null;
      if (refreshed) {
        try {
          return await performRequest<T>(path, preparedOptions);
        } catch (retryError) {
          if (retryError instanceof ApiError && retryError.status === 401) {
            authTokenStore.clear();
            if (notifyUnauthorized) notifyUnauthorizedOnce();
          }
          throw retryError;
        }
      }
    }
    if (notifyUnauthorized) {
      authTokenStore.clear();
      notifyUnauthorizedOnce();
    }
    throw error;
  }
}

export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function apiBaseUrl(): string {
  return API_BASE_URL;
}
