import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import type { SellerDto, SellerListItem, SettingsDto } from "@/lib/api/types";
import { api } from "@/test/fixtures";
import { server } from "@/test/server";
import { SellersTab } from "./SellersTab";

const settings: SettingsDto = {
  commissionMin: 25,
  commissionMax: 40,
  commissionStep: 5,
  defaultCommissionRate: 35,
  paymentTerms: [30, 60],
  defaultConsignmentDays: 30,
  timezone: "America/Sao_Paulo",
  updatedAt: "2026-10-01T12:00:00Z",
};

function makeSeller(overrides: Partial<SellerDto> & Pick<SellerDto, "id" | "name">): SellerDto {
  return { phone: "(11) 98888-0001", commissionRate: 30, status: "ativa", ...overrides };
}

function item(seller: SellerDto, piecesInHand = 0): SellerListItem {
  return { seller, piecesInHand, valueInHandCents: 0, late: false, openLots: piecesInHand ? 1 : 0 };
}

let sellers: SellerListItem[];

function page(items: SellerListItem[]) {
  return { items, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 } };
}

function renderTab() {
  const queryClient = createApiQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <SellersTab />
    </QueryClientProvider>,
  );
  return queryClient;
}

function rowOf(name: string) {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error(`Linha de ${name} não encontrada`);
  return within(row);
}

describe("sellers tab", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access-owner" });
    sellers = [
      item(makeSeller({ id: "s-ana", name: "Ana Ribeiro" }), 3),
      item(makeSeller({ id: "s-bia", name: "Bia Lima", commissionRate: 40, status: "INATIVA" })),
    ];
    server.use(
      http.get(`${api}/settings`, () => HttpResponse.json(settings)),
      http.get(`${api}/sellers`, () => HttpResponse.json(page(sellers))),
    );
  });

  it("lists sellers from the API with commission, pieces in hand and status", async () => {
    renderTab();

    expect(await screen.findByText("Ana Ribeiro")).toBeInTheDocument();
    expect(rowOf("Ana Ribeiro").getByText("30%")).toBeInTheDocument();
    expect(rowOf("Ana Ribeiro").getByText("3")).toBeInTheDocument();
    expect(rowOf("Ana Ribeiro").getByText("Ativa")).toBeInTheDocument();
    expect(rowOf("Bia Lima").getByText("Inativa")).toBeInTheDocument();
    expect(screen.getByText("2 cadastradas")).toBeInTheDocument();
  });

  it("sends search and status filters to the API", async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(`${api}/sellers`, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(page(sellers));
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(await screen.findByRole("option", { name: "Inativas" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar vendedoras" }), "bia");

    await waitFor(() => {
      const last = requests[requests.length - 1];
      expect(last?.get("status")).toBe("INATIVA");
      expect(last?.get("q")).toBe("bia");
    });
  });

  it("shows the empty state", async () => {
    sellers = [];
    renderTab();
    expect(await screen.findByText("Nenhuma vendedora cadastrada ainda.")).toBeInTheDocument();
  });

  it("shows a load error with retry", async () => {
    let fail = true;
    server.use(
      http.get(`${api}/sellers`, () =>
        fail
          ? HttpResponse.json({ status: 500, code: "INTERNAL_ERROR" }, { status: 500 })
          : HttpResponse.json(page(sellers)),
      ),
    );
    const user = userEvent.setup();
    renderTab();

    // Em 5xx o query client tenta mais uma vez antes de mostrar o erro.
    expect(
      await screen.findByText(/O servidor não conseguiu/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Ana Ribeiro")).toBeInTheDocument();
  });

  it("explains a 403 from the backend", async () => {
    server.use(
      http.get(`${api}/sellers`, () =>
        HttpResponse.json({ status: 403, code: "FORBIDDEN" }, { status: 403 }),
      ),
    );
    renderTab();
    expect(
      await screen.findByText("Apenas sócios(as) podem alterar vendedoras e parâmetros."),
    ).toBeInTheDocument();
  });

  it("creates a seller with the default commission and refreshes the list", async () => {
    let body: unknown;
    server.use(
      http.post(`${api}/sellers`, async ({ request }) => {
        body = await request.json();
        const created = makeSeller({ id: "s-cleo", name: "Cleo Souza", commissionRate: 35 });
        sellers = [...sellers, item(created)];
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("button", { name: "Nova vendedora" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByRole("combobox", { name: "Comissão" })).toHaveTextContent("35%");
    await user.type(dialog.getByLabelText("Nome"), "  Cleo Souza ");
    await user.type(dialog.getByLabelText("Telefone"), "(11) 97777-0000");
    await user.click(dialog.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Cleo Souza cadastrada.")).toBeInTheDocument();
    expect(body).toEqual({ name: "Cleo Souza", phone: "(11) 97777-0000", commissionRate: 35 });
    expect(await screen.findByRole("cell", { name: "Cleo Souza" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reuses the idempotency key when retrying after a network failure", async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post(`${api}/sellers`, ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        if (keys.length === 1) return HttpResponse.error();
        return HttpResponse.json(makeSeller({ id: "s-cleo", name: "Cleo" }), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("button", { name: "Nova vendedora" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByLabelText("Nome"), "Cleo");
    await user.type(dialog.getByLabelText("Telefone"), "1199");
    await user.click(dialog.getByRole("button", { name: "Cadastrar" }));
    expect(await dialog.findByText(/Não foi possível conectar/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Cleo cadastrada.")).toBeInTheDocument();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("validates required fields before sending", async () => {
    let called = false;
    server.use(
      http.post(`${api}/sellers`, () => {
        called = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("button", { name: "Nova vendedora" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Cadastrar" }));

    expect(dialog.getByText("Informe o nome da vendedora.")).toBeInTheDocument();
    expect(dialog.getByText("Informe o telefone.")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("shows the API field error next to the commission", async () => {
    server.use(
      http.post(`${api}/sellers`, () =>
        HttpResponse.json(
          {
            status: 400,
            code: "VALIDATION_ERROR",
            fields: { commissionRate: "Comissão fora da faixa." },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("button", { name: "Nova vendedora" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByLabelText("Nome"), "Cleo");
    await user.type(dialog.getByLabelText("Telefone"), "1199");
    await user.click(dialog.getByRole("button", { name: "Cadastrar" }));

    expect(
      await dialog.findByText("Escolha uma comissão dentro da faixa permitida."),
    ).toBeInTheDocument();
    expect(dialog.getByRole("combobox", { name: "Comissão" })).toHaveAttribute("aria-invalid", "true");
  });

  it("edits only the changed fields and warns that a new commission is for new lots", async () => {
    let body: unknown;
    server.use(
      http.patch(`${api}/sellers/s-ana`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeSeller({ id: "s-ana", name: "Ana Ribeiro", commissionRate: 25 }));
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("button", { name: "Editar Ana Ribeiro" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("combobox", { name: "Comissão" }));
    await user.click(await screen.findByRole("option", { name: "25%" }));
    expect(dialog.getByText(/só vale para os lotes entregues daqui em diante/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Vendedora atualizada.")).toBeInTheDocument();
    expect(body).toEqual({ commissionRate: 25 });
  });

  it("asks before inactivating and sends the new status", async () => {
    let body: unknown;
    server.use(
      http.patch(`${api}/sellers/s-ana`, async ({ request }) => {
        body = await request.json();
        sellers = [item(makeSeller({ id: "s-ana", name: "Ana Ribeiro", status: "inativa" }), 3), sellers[1]];
        return HttpResponse.json(sellers[0].seller);
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Ana Ribeiro");

    await user.click(screen.getByRole("switch", { name: "Inativar Ana Ribeiro" }));
    const confirm = within(await screen.findByRole("alertdialog"));
    expect(confirm.getByText(/3 peças com ela/)).toBeInTheDocument();
    await user.click(confirm.getByRole("button", { name: "Inativar" }));

    expect(await screen.findByText("Ana Ribeiro inativada.")).toBeInTheDocument();
    expect(body).toEqual({ status: "INATIVA" });
    await waitFor(() => expect(rowOf("Ana Ribeiro").getByText("Inativa")).toBeInTheDocument());
  });

  it("activates without asking", async () => {
    let body: unknown;
    server.use(
      http.patch(`${api}/sellers/s-bia`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeSeller({ id: "s-bia", name: "Bia Lima" }));
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByText("Bia Lima");

    await user.click(screen.getByRole("switch", { name: "Ativar Bia Lima" }));

    expect(await screen.findByText("Bia Lima ativada.")).toBeInTheDocument();
    expect(body).toEqual({ status: "ATIVA" });
  });
});
