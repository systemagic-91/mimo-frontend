import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Sem cookie de sessão por padrão: o bootstrap tenta renovar e recebe 401. Cada teste sobrescreve quando precisa.
export const server = setupServer(
  http.post("*/api/v1/auth/refresh", () =>
    HttpResponse.json(
      { status: 401, code: "INVALID_REFRESH_TOKEN" },
      { status: 401 },
    ),
  ),
);
