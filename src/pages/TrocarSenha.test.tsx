import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RequireAuth } from "@/components/auth/guards";
import { HomeRedirect } from "@/components/auth/home-redirect";
import { CHANGE_PASSWORD_PATH } from "@/components/auth/paths";
import { usePiecesQuery } from "@/lib/api/hooks";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import Login from "@/pages/Login";
import TrocarSenha from "@/pages/TrocarSenha";
import { server } from "@/test/server";

const api = "http://localhost:8080/api/v1";

const session = {
  loggedAt: "2026-10-31T12:00:00Z",
  expiresAt: "2026-10-31T12:15:00Z",
};

const staff = {
  id: "user-staff",
  name: "Conta equipe",
  email: "staff@example.com",
  role: "staff" as const,
  active: true,
  mustChangePassword: false,
};

const pendingStaff = { ...staff, mustChangePassword: true };

/** Tela operacional de exemplo: busca peças, como as telas reais. */
function StockProbe() {
  const pieces = usePiecesQuery();
  return <p>Estoque {pieces.isSuccess ? "carregado" : ""}</p>;
}

function renderApp(initialPath: string) {
  const queryClient = createApiQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path={CHANGE_PASSWORD_PATH}
            element={
              <RequireAuth>
                <TrocarSenha />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomeRedirect />
              </RequireAuth>
            }
          />
          <Route
            path="/estoque"
            element={
              <RequireAuth>
                <StockProbe />
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

function mockMe(user: typeof staff) {
  server.use(http.get(`${api}/auth/me`, () => HttpResponse.json({ user, session })));
}

async function fillChangePassword(current: string, next: string, confirmation = next) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Senha atual"), current);
  await user.type(screen.getByLabelText("Nova senha"), next);
  await user.type(screen.getByLabelText("Confirmar nova senha"), confirmation);
  await user.click(screen.getByRole("button", { name: "Trocar senha" }));
  return user;
}

describe("mandatory password change", () => {
  it("keeps a user with a temporary password on the change screen without loading other screens", async () => {
    authTokenStore.set({ accessToken: "access-temp" });
    mockMe(pendingStaff);
    // Nenhum handler para /pieces: uma query de outra tela falharia o teste (onUnhandledRequest: "error").

    renderApp("/estoque");

    expect(
      await screen.findByRole("heading", { name: "Trocar senha" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sua senha é temporária/)).toBeInTheDocument();
    expect(screen.queryByText(/Estoque/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("shows a wrong current password as an error without logging out", async () => {
    authTokenStore.set({ accessToken: "access-temp" });
    mockMe(pendingStaff);
    server.use(
      http.post(`${api}/auth/change-password`, () =>
        HttpResponse.json({ status: 401, code: "INVALID_CREDENTIALS" }, { status: 401 }),
      ),
    );

    renderApp(CHANGE_PASSWORD_PATH);
    await fillChangePassword("senha-errada-1", "nova-senha-segura");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A senha atual está incorreta.",
    );
    expect(screen.getByRole("heading", { name: "Trocar senha" })).toBeInTheDocument();
    expect(authTokenStore.getAccessToken()).toBe("access-temp");
  });

  it("validates the new password before calling the API", async () => {
    authTokenStore.set({ accessToken: "access-temp" });
    mockMe(pendingStaff);

    renderApp(CHANGE_PASSWORD_PATH);
    await fillChangePassword("temporaria-123", "curta");
    expect(await screen.findByRole("alert")).toHaveTextContent("de 12 a 72 caracteres");
  });

  it("returns to the login after the change and signs in with the new password", async () => {
    authTokenStore.set({ accessToken: "access-temp" });
    mockMe(pendingStaff);
    let changeBody: unknown;
    server.use(
      http.post(`${api}/auth/change-password`, async ({ request }) => {
        changeBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(`${api}/auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "staff@example.com",
          password: "nova-senha-segura",
        });
        return HttpResponse.json({ user: staff, session, accessToken: "access-new" });
      }),
      http.get(`${api}/pieces`, () =>
        HttpResponse.json({
          items: [],
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
          summary: { totalValueCents: 0 },
        }),
      ),
    );

    renderApp(CHANGE_PASSWORD_PATH);
    const user = await fillChangePassword("temporaria-123", "nova-senha-segura");

    expect(
      await screen.findByText("Senha alterada. Entre com a nova senha."),
    ).toBeInTheDocument();
    expect(changeBody).toEqual({
      currentPassword: "temporaria-123",
      newPassword: "nova-senha-segura",
    });
    expect(authTokenStore.getAccessToken()).toBeNull();

    await user.type(screen.getByLabelText("E-mail"), "staff@example.com");
    await user.type(screen.getByLabelText("Senha"), "nova-senha-segura");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Estoque carregado")).toBeInTheDocument();
  });

  it("goes to the change screen when any request answers 403 PASSWORD_CHANGE_REQUIRED", async () => {
    authTokenStore.set({ accessToken: "access-1" });
    mockMe(staff);
    server.use(
      http.get(`${api}/pieces`, () =>
        HttpResponse.json(
          { status: 403, code: "PASSWORD_CHANGE_REQUIRED" },
          { status: 403 },
        ),
      ),
    );

    renderApp("/estoque");

    expect(
      await screen.findByRole("heading", { name: "Trocar senha" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sua senha é temporária/)).toBeInTheDocument();
    await waitFor(() => expect(authTokenStore.getAccessToken()).toBe("access-1"));
  });

  it("lets anyone change the password voluntarily and cancel back home", async () => {
    authTokenStore.set({ accessToken: "access-1" });
    mockMe(staff);

    renderApp(CHANGE_PASSWORD_PATH);

    expect(await screen.findByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/");
    expect(screen.queryByText(/Sua senha é temporária/)).not.toBeInTheDocument();
  });

  it("explains a deactivated account on the login screen", async () => {
    server.use(
      http.post(`${api}/auth/login`, () =>
        HttpResponse.json({ status: 403, code: "USER_INACTIVE" }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(await screen.findByLabelText("E-mail"), "staff@example.com");
    await user.type(screen.getByLabelText("Senha"), "qualquer-senha");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esta conta está desativada");
  });
});
