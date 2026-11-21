import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ConsignmentDetailsDto,
  ConsignmentItemDto,
  ConsignmentListItem,
  SellerDto,
  UserRole,
} from "@/lib/api/types";
import { addDaysToDate, endOfDayInZone, periodRange, todayInZone } from "@/lib/store-time";
import { api } from "@/test/fixtures";
import { server } from "@/test/server";
import ConsignacaoSeller from ".";

const SP = "America/Sao_Paulo";
const seller: SellerDto = { id: "s-ana", name: "Ana Ribeiro", phone: "(11) 1", commissionRate: 30, status: "ativa" };
const deliveredAt = "2026-10-01T15:00:00Z";

function item(overrides: Partial<ConsignmentItemDto> & Pick<ConsignmentItemDto, "pieceId" | "codeSnapshot">): ConsignmentItemDto {
  return {
    id: `i-${overrides.pieceId}`,
    consignmentId: "c-1",
    typeSnapshot: "Brinco",
    valueCentsSnapshot: 10000,
    commissionRateSnapshot: 30,
    status: "COM_VENDEDORA",
    ...overrides,
  };
}

let lot: ConsignmentDetailsDto;
let calls: Record<string, number>;
let actionBodies: unknown[];

const listItem = (): ConsignmentListItem => ({
  id: "c-1",
  code: "C-2026-001",
  sellerId: seller.id,
  deliveredAt,
  dueAt: "2026-12-01T02:59:59.999999Z",
  dueInDays: 9,
  status: "em_dia",
  paymentTermDays: 30,
  seller,
  piecesInHand: lot.items.filter((i) => i.status === "COM_VENDEDORA").length,
  valueInHandCents: 0,
});

function count(name: string) {
  calls[name] = (calls[name] ?? 0) + 1;
}

function renderPage(role: UserRole) {
  const queryClient = createApiQueryClient();
  queryClient.setQueryData(queryKeys.auth.me(), {
    user: {
      id: "u-1",
      name: "Pessoa",
      email: "p@luma.com.br",
      role,
      active: true,
      mustChangePassword: false,
      createdAt: "2026-10-01T12:00:00Z",
      updatedAt: "2026-10-01T12:00:00Z",
    },
    session: { loggedAt: "2026-11-21T12:00:00Z", expiresAt: "2026-11-21T12:15:00Z" },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <MemoryRouter initialEntries={["/consignacao/s-ana"]}>
        <Routes>
          <Route path="/consignacao/:sellerId" element={<ConsignacaoSeller />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openLot(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /C-2026-001/ }));
  return within(await screen.findByRole("list", { name: "Peças do lote C-2026-001" }));
}

describe("seller consignment page", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    calls = {};
    actionBodies = [];
    lot = {
      id: "c-1",
      code: "C-2026-001",
      sellerId: seller.id,
      deliveredAt,
      dueAt: "2026-12-01T02:59:59.999999Z",
      status: "ABERTA",
      paymentTermDays: 30,
      late: false,
      seller,
      items: [
        item({ pieceId: "p-1", codeSnapshot: "LU-0001" }),
        item({ pieceId: "p-2", codeSnapshot: "LU-0002" }),
      ],
    };
    server.use(
      http.get(`${api}/settings`, () =>
        HttpResponse.json({
          commissionMin: 25,
          commissionMax: 40,
          commissionStep: 5,
          defaultCommissionRate: 30,
          paymentTerms: [30, 60],
          defaultConsignmentDays: 30,
          timezone: SP,
        }),
      ),
      http.get(`${api}/sellers/s-ana`, () => HttpResponse.json(seller)),
      http.get(`${api}/sellers/s-ana/stats`, () => {
        count("stats");
        return HttpResponse.json({
          inHand: 2,
          inHandValueCents: 20000,
          totalSoldCount: 5,
          totalSoldValueCents: 50000,
          totalCommissionCents: 15000,
        });
      }),
      http.get(`${api}/sellers/s-ana/commission`, ({ request }) => {
        count("commission");
        const params = new URL(request.url).searchParams;
        calls[`commission:${params.get("from")}:${params.get("to")}`] = 1;
        return HttpResponse.json({ soldCount: 3, soldValueCents: 30000, commissionCents: 9000 });
      }),
      http.get(`${api}/sellers/s-ana/payment-schedule`, () => {
        count("schedule");
        return HttpResponse.json({
          groups: [
            { paymentTermDays: 30, soldCount: 2, amountDueCents: 14000, firstDueDate: "2026-12-05", lastDueDate: "2026-12-10" },
            { paymentTermDays: null, soldCount: 1, amountDueCents: 7000, firstDueDate: null, lastDueDate: null },
          ],
          totalDueCents: 21000,
        });
      }),
      http.get(`${api}/consignments`, ({ request }) => {
        count("lots");
        expect(new URL(request.url).searchParams.get("sellerId")).toBe("s-ana");
        return HttpResponse.json({ items: [listItem()], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
      }),
      http.get(`${api}/consignments/c-1`, () => {
        count("lot");
        return HttpResponse.json(lot);
      }),
      http.post(`${api}/consignments/c-1/items/:pieceId/:action`, async ({ params, request }) => {
        actionBodies.push(await request.json());
        const done = params.action === "sold";
        lot = {
          ...lot,
          items: lot.items.map((i) =>
            i.pieceId === params.pieceId
              ? {
                  ...i,
                  status: done ? "VENDIDA" : "DEVOLVIDA",
                  soldAt: done ? "2026-11-21T15:00:00Z" : null,
                  returnedAt: done ? null : "2026-11-21T15:00:00Z",
                  paymentDueDate: done ? "2026-12-21" : null,
                  amountDueCents: done ? 7000 : null,
                }
              : i,
          ),
        };
        return HttpResponse.json(lot);
      }),
    );
  });

  it("shows stats, commission and the payment schedule from the API to the owner", async () => {
    renderPage("owner");

    expect(await screen.findByText("Comissão total")).toBeInTheDocument();
    expect(screen.getByText(/150,00/)).toBeInTheDocument();
    expect(await screen.findByText(/90,00/)).toBeInTheDocument();
    const schedule = within(await screen.findByRole("list", { name: "Prazos de pagamento" }));
    expect(schedule.getByText("30 dias · 2 vendas")).toBeInTheDocument();
    expect(schedule.getByText("05/12/2026 a 10/12/2026")).toBeInTheDocument();
    expect(schedule.getByText("Prazo não informado · 1 venda")).toBeInTheDocument();
    expect(screen.getByText(/210,00/)).toBeInTheDocument();
    // O mês atual é calculado no fuso da loja.
    const { from, to } = periodRange("mes_atual", SP);
    expect(calls[`commission:${from}:${to}`]).toBe(1);
  });

  it("does not call nor show stats, commission or schedule for staff", async () => {
    renderPage("staff");

    await screen.findByRole("button", { name: /C-2026-001/ });
    expect(screen.queryByText("Comissão apurada")).not.toBeInTheDocument();
    expect(screen.queryByText("Comissão total")).not.toBeInTheDocument();
    expect(calls.stats).toBeUndefined();
    expect(calls.commission).toBeUndefined();
    expect(calls.schedule).toBeUndefined();
  });

  it("marks an item as sold, shows the persisted state and refreshes the lists", async () => {
    const user = userEvent.setup();
    renderPage("owner");
    const items = await openLot(user);
    const lotsBefore = calls.lots;

    await user.click(items.getByRole("button", { name: "Vendida LU-0001" }));

    expect(await screen.findByText("Venda registrada")).toBeInTheDocument();
    expect(actionBodies).toEqual([{}]);
    expect(await items.findByText(/Pagamento até 21\/12\/2026 · repassar R\$\s70,00/)).toBeInTheDocument();
    expect(items.queryByRole("button", { name: "Vendida LU-0001" })).not.toBeInTheDocument();
    await waitFor(() => expect(calls.lots).toBeGreaterThan(lotsBefore));
  });

  it("disables the item buttons while the action is saving", async () => {
    server.use(
      http.post(`${api}/consignments/c-1/items/:pieceId/sold`, async () => {
        await delay(200);
        return HttpResponse.json(lot);
      }),
    );
    const user = userEvent.setup();
    renderPage("owner");
    const items = await openLot(user);

    await user.click(items.getByRole("button", { name: "Vendida LU-0001" }));

    expect(items.getByRole("button", { name: "Devolvida LU-0002" })).toBeDisabled();
    expect(items.getByRole("button", { name: "Vendida LU-0001" })).toBeDisabled();
  });

  it("warns and reloads the lot when someone else already registered the item", async () => {
    server.use(
      http.post(`${api}/consignments/c-1/items/:pieceId/returned`, () =>
        HttpResponse.json({ status: 409, code: "ITEM_NOT_WITH_SELLER" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderPage("owner");
    const items = await openLot(user);
    const lotBefore = calls.lot;

    await user.click(items.getByRole("button", { name: "Devolvida LU-0002" }));

    expect(await screen.findByText(/já foi vendida ou devolvida por outra pessoa/)).toBeInTheDocument();
    await waitFor(() => expect(calls.lot).toBeGreaterThan(lotBefore));
  });

  it("registers a late return on the chosen day, at the end of the day in the store timezone", async () => {
    const user = userEvent.setup();
    renderPage("staff");
    const items = await openLot(user);
    const yesterday = addDaysToDate(todayInZone(SP), -1);

    await user.click(items.getByRole("button", { name: "Registrar LU-0002 com data" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("radio", { name: "Devolvida" }));
    const date = dialog.getByLabelText("Data");
    await user.clear(date);
    await user.type(date, yesterday);
    await user.click(dialog.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("Devolução registrada")).toBeInTheDocument();
    expect(actionBodies).toEqual([{ returnedAt: endOfDayInZone(yesterday, SP) }]);
  });

  it("shows the API date error next to the field", async () => {
    server.use(
      http.post(`${api}/consignments/c-1/items/:pieceId/sold`, () =>
        HttpResponse.json(
          { status: 400, code: "VALIDATION_ERROR", fields: { soldAt: "fora do intervalo" } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage("owner");
    const items = await openLot(user);

    await user.click(items.getByRole("button", { name: "Registrar LU-0001 com data" }));
    const dialog = within(await screen.findByRole("dialog"));
    const date = dialog.getByLabelText("Data");
    await user.clear(date);
    await user.type(date, addDaysToDate(todayInZone(SP), -2));
    await user.click(dialog.getByRole("button", { name: "Registrar" }));

    expect(
      await dialog.findByText("A data precisa estar entre a entrega do lote e hoje."),
    ).toBeInTheDocument();
  });

  it("hides the amount due when the API sends it as null (staff)", async () => {
    lot = {
      ...lot,
      items: [
        item({
          pieceId: "p-1",
          codeSnapshot: "LU-0001",
          status: "VENDIDA",
          soldAt: "2026-11-10T15:00:00Z",
          paymentDueDate: "2026-12-10",
          amountDueCents: null,
        }),
      ],
    };
    const user = userEvent.setup();
    renderPage("staff");
    const items = await openLot(user);

    expect(items.getByText("Pagamento até 10/12/2026")).toBeInTheDocument();
    expect(items.queryByText(/repassar/)).not.toBeInTheDocument();
  });

  it("explains when the seller does not exist", async () => {
    server.use(
      http.get(`${api}/sellers/s-ana`, () =>
        HttpResponse.json({ status: 404, code: "SELLER_NOT_FOUND" }, { status: 404 }),
      ),
    );
    renderPage("owner");
    expect(await screen.findByText("Vendedora não encontrada.")).toBeInTheDocument();
  });
});
