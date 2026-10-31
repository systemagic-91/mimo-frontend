import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth, RequireRole } from "@/components/auth/guards";
import { HomeRedirect } from "@/components/auth/home-redirect";
import Login from "@/pages/Login";
import { authApi } from "./auth";
import { useLogoutMutation } from "./hooks";
import { ApiError, authTokenStore } from "./http";
import { createApiQueryClient } from "./query-client";

const owner = {
  id: "user-owner",
  name: "Conta responsável",
  email: "owner@example.com",
  role: "owner" as const,
};

const staff = {
  id: "user-staff",
  name: "Conta equipe",
  email: "staff@example.com",
  role: "staff" as const,
};

const session = {
  loggedAt: "2026-10-15T12:00:00Z",
  expiresAt: "2026-10-15T12:15:00Z",
};

const authResponse = {
  user: staff,
  session,
  accessToken: "access-login",
};

function PrivateContent() {
  const location = useLocation();
  return (
    <>
      <p>Área privada</p>
      <p>Destino: {location.pathname + location.search}</p>
      <LogoutButton />
    </>
  );
}

function LogoutButton() {
  const logout = useLogoutMutation();
  return (
    <button type="button" onClick={() => logout.mutate()}>
      Sair
    </button>
  );
}

function renderRouter(
  initialEntries: NonNullable<
    ComponentProps<typeof MemoryRouter>["initialEntries"]
  >,
) {
  const queryClient = createApiQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/private"
            element={
              <RequireAuth>
                <PrivateContent />
              </RequireAuth>
            }
          />
          <Route
            path="/owner"
            element={
              <RequireAuth>
                <RequireRole role="owner">
                  <p>Área de owner</p>
                </RequireRole>
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
                <p>Estoque</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("remote authentication session", () => {
  // Sem cookie de sessão por padrão; os testes que restauram a sessão sobrescrevem.
  beforeEach(() => {
    vi.spyOn(authApi, "refresh").mockResolvedValue(null);
  });

  it("restores a reload from the session cookie and validates /auth/me", async () => {
    const refresh = vi.spyOn(authApi, "refresh").mockImplementation(async () => {
      const response = { ...authResponse, accessToken: "access-restored" };
      authTokenStore.set(response);
      return response;
    });
    const me = vi
      .spyOn(authApi, "me")
      .mockResolvedValue({ user: staff, session });

    renderRouter(["/private"]);

    expect(await screen.findByText("Área privada")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
    expect(me).toHaveBeenCalledOnce();
    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.length).toBe(0);
  });

  it("uses generic feedback for invalid credentials and allows retry", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(
      new ApiError(401, {
        title: "Unauthorized",
        code: "INVALID_CREDENTIALS",
      }),
    );
    const user = userEvent.setup();
    renderRouter(["/login"]);
    await user.type(
      await screen.findByLabelText("E-mail"),
      "unknown@example.com",
    );
    await user.type(screen.getByLabelText("Senha"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("E-mail ou senha inválidos."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(screen.queryByText(/demonstração|luma123/i)).not.toBeInTheDocument();
  });

  it("shows a distinct network error and keeps the login form available", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(
      new ApiError(0, {
        title: "Network error",
        code: "NETWORK_ERROR",
      }),
    );
    const user = userEvent.setup();
    renderRouter(["/login"]);
    await user.type(
      await screen.findByLabelText("E-mail"),
      "staff@example.com",
    );
    await user.type(screen.getByLabelText("Senha"), "valid-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText(/Não foi possível conectar ao servidor/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeEnabled();
    expect(screen.getByLabelText("Senha")).toBeEnabled();
  });

  it("returns to the requested path and query after successful login", async () => {
    const login = vi
      .spyOn(authApi, "login")
      .mockImplementation(async () => {
        authTokenStore.set(authResponse);
        return authResponse;
      });
    const user = userEvent.setup();
    renderRouter([
      {
        pathname: "/login",
        state: { from: "/private?tab=stock" },
      },
    ]);

    await user.type(
      await screen.findByLabelText("E-mail"),
      "staff@example.com",
    );
    await user.type(screen.getByLabelText("Senha"), "valid-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Área privada")).toBeInTheDocument();
    expect(screen.getByText("Destino: /private?tab=stock")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("staff@example.com", "valid-password");
  });

  it("redirects staff away from an owner-only route to inventory", async () => {
    authTokenStore.set({ accessToken: "access-staff" });
    vi.spyOn(authApi, "me").mockResolvedValue({ user: staff, session });

    renderRouter(["/owner"]);

    expect(await screen.findByText("Estoque")).toBeInTheDocument();
    expect(screen.queryByText("Área de owner")).not.toBeInTheDocument();
  });

  it("revokes the server session and clears the in-memory token on logout", async () => {
    authTokenStore.set({ accessToken: "access-staff" });
    vi.spyOn(authApi, "me").mockResolvedValue({ user: staff, session });
    const logout = vi.spyOn(authApi, "logout").mockImplementation(async () => {
      authTokenStore.clear();
    });

    const user = userEvent.setup();
    renderRouter(["/private"]);
    await screen.findByText("Área privada");
    await user.click(screen.getByRole("button", { name: "Sair" }));

    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(authTokenStore.getAccessToken()).toBeNull();
  });

  it("does not redirect before checking a protected route", async () => {
    authTokenStore.set({ accessToken: "access-owner" });
    vi.spyOn(authApi, "me").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ user: owner, session }), 40);
        }),
    );

    renderRouter(["/private"]);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    expect(await screen.findByText("Área privada")).toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });

  it("sends the user to login when the session cookie is missing or expired", async () => {
    renderRouter(["/private"]);

    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.queryByText("Área privada")).not.toBeInTheDocument();
    expect(authTokenStore.getAccessToken()).toBeNull();
  });

  it("shows a retryable error instead of logging out when the refresh fails for another reason", async () => {
    vi.spyOn(authApi, "refresh").mockRejectedValue(
      new ApiError(0, { title: "Network error", code: "NETWORK_ERROR" }),
    );

    renderRouter(["/private"]);

    expect(
      await screen.findByText("Não foi possível validar sua sessão."),
    ).toBeInTheDocument();
  });
});
