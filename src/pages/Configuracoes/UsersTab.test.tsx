import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { UserDto } from "@/lib/api/types";
import { server } from "@/test/server";
import { UsersTab } from "./UsersTab";

const api = "http://localhost:8080/api/v1";

function makeUser(overrides: Partial<UserDto> & Pick<UserDto, "id" | "name" | "email">): UserDto {
  return {
    role: "staff",
    active: true,
    mustChangePassword: false,
    createdAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

const self = makeUser({ id: "u-self", name: "Bia Dona", email: "bia@luma.com.br", role: "owner" });
const ana = makeUser({ id: "u-ana", name: "Ana Equipe", email: "ana@luma.com.br", mustChangePassword: true });
const carla = makeUser({ id: "u-carla", name: "Carla Sócia", email: "carla@luma.com.br", role: "owner" });
const davi = makeUser({ id: "u-davi", name: "Davi Antigo", email: "davi@luma.com.br", active: false });

let users: UserDto[];

function page(items: UserDto[]) {
  return {
    items,
    pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
  };
}

function renderTab() {
  const queryClient = createApiQueryClient();
  queryClient.setQueryData(queryKeys.auth.me(), {
    user: self,
    session: { loggedAt: "2026-10-31T12:00:00Z", expiresAt: "2026-10-31T12:15:00Z" },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <UsersTab />
    </QueryClientProvider>,
  );
}

function rowOf(name: string) {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error(`Linha de ${name} não encontrada`);
  return within(row);
}

describe("users tab", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access-owner" });
    users = [self, ana, carla, davi];
    server.use(
      http.get(`${api}/users`, () => HttpResponse.json(page(users))),
    );
  });

  it("lists users with role, status and the pending password change mark", async () => {
    renderTab();

    expect(await screen.findByText("Ana Equipe")).toBeInTheDocument();
    expect(rowOf("Ana Equipe").getByText("Troca de senha pendente")).toBeInTheDocument();
    expect(rowOf("Ana Equipe").getByText("Equipe")).toBeInTheDocument();
    expect(rowOf("Carla Sócia").getByText("Sócia(o)")).toBeInTheDocument();
    expect(rowOf("Davi Antigo").getByText("Inativo")).toBeInTheDocument();
    expect(screen.getByText("4 usuários")).toBeInTheDocument();
  });

  it("hides role, deactivation and password reset on the owner's own account", async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Bia Dona");

    const own = rowOf("Bia Dona");
    expect(own.getByText("(você)")).toBeInTheDocument();
    expect(own.getByRole("button", { name: "Editar Bia Dona" })).toBeInTheDocument();
    expect(own.queryByRole("button", { name: /Redefinir senha/ })).not.toBeInTheDocument();
    expect(own.queryByRole("button", { name: /Desativar/ })).not.toBeInTheDocument();

    await user.click(own.getByRole("button", { name: "Editar Bia Dona" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("E-mail")).toHaveValue("bia@luma.com.br");
    expect(within(dialog).queryByLabelText("Papel")).not.toBeInTheDocument();
  });

  it("creates a user, shows a duplicate e-mail error and uses a new idempotency key per submission", async () => {
    const keys: string[] = [];
    const bodies: unknown[] = [];
    server.use(
      http.post(`${api}/users`, async ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key") ?? "");
        const body = (await request.json()) as { email: string; name: string };
        bodies.push(body);
        if (body.email === "ana@luma.com.br") {
          return HttpResponse.json({ status: 409, code: "EMAIL_ALREADY_USED" }, { status: 409 });
        }
        const created = makeUser({
          id: "u-eva",
          name: body.name,
          email: body.email,
          mustChangePassword: true,
        });
        users = [...users, created];
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Equipe");

    await user.click(screen.getByRole("button", { name: "Novo usuário" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Nome"), "Eva Nova");
    await user.type(within(dialog).getByLabelText("E-mail"), "ana@luma.com.br");
    await user.type(within(dialog).getByLabelText("Senha temporária"), "temporaria-123");
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Já existe um usuário com este e-mail.",
    );
    // A senha não fica no formulário depois do envio.
    expect(within(dialog).getByLabelText("Senha temporária")).toHaveValue("");

    await user.clear(within(dialog).getByLabelText("E-mail"));
    await user.type(within(dialog).getByLabelText("E-mail"), "eva@luma.com.br");
    await user.type(within(dialog).getByLabelText("Senha temporária"), "temporaria-123");
    await user.click(within(dialog).getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Eva Nova")).toBeInTheDocument();
    expect(bodies[1]).toEqual({
      name: "Eva Nova",
      email: "eva@luma.com.br",
      role: "staff",
      temporaryPassword: "temporaria-123",
    });
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("edits another user's e-mail without touching the role", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(`${api}/users/u-ana`, async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ ...ana, email: "ana.nova@luma.com.br" });
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Equipe");

    await user.click(rowOf("Ana Equipe").getByRole("button", { name: "Editar Ana Equipe" }));
    const dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByLabelText("E-mail"));
    await user.type(within(dialog).getByLabelText("E-mail"), "ana.nova@luma.com.br");
    await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(patchBody).toEqual({ email: "ana.nova@luma.com.br" }));
  });

  it("resets another user's password after validating the temporary password", async () => {
    let resetBody: unknown;
    let resetKey: string | null = null;
    server.use(
      http.post(`${api}/users/u-ana/reset-password`, async ({ request }) => {
        resetKey = request.headers.get("Idempotency-Key");
        resetBody = await request.json();
        return HttpResponse.json({ ...ana, mustChangePassword: true });
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Equipe");

    await user.click(rowOf("Ana Equipe").getByRole("button", { name: "Redefinir senha de Ana Equipe" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("será deslogado(a) na hora");

    await user.type(within(dialog).getByLabelText("Nova senha temporária"), "curta");
    await user.click(within(dialog).getByRole("button", { name: "Redefinir e deslogar" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("de 12 a 72 caracteres");
    expect(resetBody).toBeUndefined();

    await user.clear(within(dialog).getByLabelText("Nova senha temporária"));
    await user.type(within(dialog).getByLabelText("Nova senha temporária"), "outra-temporaria-1");
    await user.click(within(dialog).getByRole("button", { name: "Redefinir e deslogar" }));

    expect(await screen.findByText(/Senha de Ana Equipe redefinida/)).toBeInTheDocument();
    expect(resetBody).toEqual({ temporaryPassword: "outra-temporaria-1" });
    expect(resetKey).toBeTruthy();
  });

  it("confirms before deactivating and reactivates without confirmation", async () => {
    const patches: Array<{ id: string; body: unknown }> = [];
    server.use(
      http.patch(`${api}/users/:id`, async ({ request, params }) => {
        const body = (await request.json()) as { active: boolean };
        patches.push({ id: String(params.id), body });
        users = users.map((item) =>
          item.id === params.id ? { ...item, active: body.active } : item,
        );
        return HttpResponse.json(users.find((item) => item.id === params.id));
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Equipe");

    await user.click(rowOf("Ana Equipe").getByRole("button", { name: "Desativar Ana Equipe" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("será deslogado(a) na hora");
    expect(patches).toHaveLength(0);
    await user.click(within(confirm).getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(patches[0]).toEqual({ id: "u-ana", body: { active: false } }));

    await user.click(rowOf("Davi Antigo").getByRole("button", { name: "Reativar Davi Antigo" }));
    await waitFor(() => expect(patches[1]).toEqual({ id: "u-davi", body: { active: true } }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("explains the last-owner rule when the backend refuses a deactivation", async () => {
    server.use(
      http.patch(`${api}/users/u-carla`, () =>
        HttpResponse.json({ status: 422, code: "LAST_OWNER" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Carla Sócia");

    await user.click(rowOf("Carla Sócia").getByRole("button", { name: "Desativar Carla Sócia" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Desativar" }),
    );

    expect(
      await screen.findByText(/A loja precisa de pelo menos um\(a\) sócio\(a\) ativo\(a\)/),
    ).toBeInTheDocument();
  });

  it("shows a clear message when the list is forbidden", async () => {
    server.use(
      http.get(`${api}/users`, () =>
        HttpResponse.json({ status: 403, code: "FORBIDDEN" }, { status: 403 }),
      ),
    );
    renderTab();

    expect(
      await screen.findByText("Apenas sócios(as) podem gerenciar usuários."),
    ).toBeInTheDocument();
  });
});
