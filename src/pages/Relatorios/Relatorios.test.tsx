import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { periodRange } from "@/lib/store-time";
import { api, makeEvent, makePiece, setCurrentUser } from "@/test/fixtures";
import type { UserRole } from "@/lib/api/types";
import { server } from "@/test/server";
import Relatorios from ".";

vi.mock("@/lib/csv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/csv")>();
  return { ...actual, downloadCsv: vi.fn() };
});

const SP = "America/Sao_Paulo";
let turnoverRequests: URLSearchParams[];
let staleRequests: URLSearchParams[];

function renderPage(role?: UserRole) {
  const queryClient = createApiQueryClient();
  if (role) setCurrentUser(queryClient, role);
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Relatorios />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lastCsv() {
  const [filename, headers, rows] = vi.mocked(downloadCsv).mock.lastCall!;
  return { filename, csv: buildCsv(headers, rows) };
}

describe("reports", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    vi.mocked(downloadCsv).mockClear();
    turnoverRequests = [];
    staleRequests = [];
    server.use(
      http.get(`${api}/settings`, () =>
        HttpResponse.json({
          commissionMin: 25,
          commissionMax: 40,
          commissionStep: 5,
          defaultCommissionRate: 30,
          paymentTerms: [30],
          defaultConsignmentDays: 30,
          timezone: SP,
        }),
      ),
      http.get(`${api}/reports/turnover`, ({ request }) => {
        turnoverRequests.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          items: [
            {
              code: "LU-0001",
              type: "Brinco",
              valueCents: 8490,
              // 01:30 UTC do dia 10 ainda é dia 9 em São Paulo.
              soldAt: "2026-11-10T01:30:00Z",
              sellerId: "s-ana",
              sellerName: "Ana; Ribeiro",
              daysToSell: 12,
              commissionCents: 2547,
              totalCostCents: null,
              marginCents: null,
            },
          ],
          summary: { soldCount: 1, soldValueCents: 8490, marginCents: null, piecesWithoutFullCost: 1 },
        });
      }),
      http.get(`${api}/reports/overdue`, () =>
        HttpResponse.json({
          items: [
            {
              sellerId: "s-ana",
              sellerName: "Ana Ribeiro",
              phone: "(11) 98888-0001",
              lateLots: 2,
              piecesInHand: 4,
              valueAtRiskCents: 33980,
              maxOverdueDays: 1,
            },
          ],
        }),
      ),
      http.get(`${api}/reports/stale-pieces`, ({ request }) => {
        staleRequests.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          items: [{ id: "p-9", code: "LU-0009", type: "Colar", valueCents: 15000, daysStopped: 75 }],
          summary: { count: 1, valueCents: 15000 },
        });
      }),
    );
  });

  it("asks the turnover of the current month in the store timezone and shows cents as money", async () => {
    renderPage();

    const row = within((await screen.findByText("LU-0001")).closest("tr")!);
    const { from, to } = periodRange("mes_atual", SP);
    expect(turnoverRequests[0].get("from")).toBe(from);
    expect(turnoverRequests[0].get("to")).toBe(to);
    expect(row.getByText(/R\$\s84,90/)).toBeInTheDocument();
    expect(row.getByText("09/11/2026")).toBeInTheDocument();
    expect(row.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/1 venda ·/)).toBeInTheDocument();
  });

  it("refetches when the period changes and blocks invalid periods", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("LU-0001");

    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    const previous = periodRange("mes_anterior", SP);
    await waitFor(() => expect(turnoverRequests[turnoverRequests.length - 1]?.get("from")).toBe(previous.from));
    expect(turnoverRequests[turnoverRequests.length - 1]?.get("to")).toBe(previous.to);

    const count = turnoverRequests.length;
    const fromInput = screen.getByLabelText("De");
    await user.clear(fromInput);
    await user.type(fromInput, "2027-01-01");
    expect(await screen.findByText("A data inicial precisa ser antes ou igual à final.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();

    await user.clear(fromInput);
    await user.type(fromInput, "2020-01-01");
    expect(await screen.findByText("O período pode ter no máximo 366 dias.")).toBeInTheDocument();
    expect(turnoverRequests).toHaveLength(count);
  });

  it("exports the turnover rows shown, ready for Excel", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("LU-0001");

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    const { filename, csv } = lastCsv();
    const { from, to } = periodRange("mes_atual", SP);
    expect(filename).toBe(`giro-de-pecas-${from}-a-${to}.csv`);
    expect(csv).toBe(
      "﻿Codigo;Tipo;Valor;Vendida em;Vendedora;Dias ate venda\r\n" +
        'LU-0001;Brinco;"84,90";09/11/2026;"Ana; Ribeiro";12',
    );
  });

  it("shows commission, cost and margin to the owner, with a dash for partial or missing costs", async () => {
    const base = { type: "Brinco", soldAt: "2026-11-10T15:00:00Z", sellerId: "s-ana", sellerName: "Ana", daysToSell: 3 };
    server.use(
      http.get(`${api}/reports/turnover`, () =>
        HttpResponse.json({
          items: [
            { ...base, code: "LU-0001", valueCents: 10000, commissionCents: 3000, totalCostCents: 4000, marginCents: 3000 },
            { ...base, code: "LU-0002", valueCents: 10000, commissionCents: 3000, totalCostCents: 2500, marginCents: null },
            { ...base, code: "LU-0003", valueCents: 5000, commissionCents: 1500, totalCostCents: null, marginCents: null },
            { ...base, code: "LU-0004", valueCents: 5000, commissionCents: 1500, totalCostCents: 6000, marginCents: -2500 },
          ],
          summary: { soldCount: 4, soldValueCents: 30000, marginCents: 500, piecesWithoutFullCost: 2 },
        }),
      ),
    );
    const user = userEvent.setup();
    renderPage("owner");

    const full = within((await screen.findByText("LU-0001")).closest("tr")!);
    expect(full.getByText(/R\$\s30,00/, { selector: "td:nth-child(7)" })).toBeInTheDocument();
    expect(full.getByText(/R\$\s40,00/)).toBeInTheDocument();
    // Custo parcial: mostra o custo total, mas a margem fica "—".
    const partial = within(screen.getByText("LU-0002").closest("tr")!);
    expect(partial.getByText(/R\$\s25,00/)).toBeInTheDocument();
    expect(partial.getByText("—")).toBeInTheDocument();
    expect(within(screen.getByText("LU-0003").closest("tr")!).getAllByText("—")).toHaveLength(2);
    expect(within(screen.getByText("LU-0004").closest("tr")!).getByText(/-R\$\s25,00/)).toHaveClass("text-late");
    expect(screen.getByText(/margem de 2 de 4 vendas; 2 sem os dois custos/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s5,00/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));
    const lines = lastCsv().csv.split("\r\n");
    expect(lines[0]).toBe("\uFEFFCodigo;Tipo;Valor;Vendida em;Vendedora;Dias ate venda;Comissao;Custo;Margem");
    expect(lines[1]).toBe('LU-0001;Brinco;"100,00";10/11/2026;Ana;3;"30,00";"40,00";"30,00"');
    expect(lines[2]).toBe('LU-0002;Brinco;"100,00";10/11/2026;Ana;3;"30,00";"25,00";');
    expect(lines[3]).toBe('LU-0003;Brinco;"50,00";10/11/2026;Ana;3;"15,00";;');
    expect(lines[4]).toBe('LU-0004;Brinco;"50,00";10/11/2026;Ana;3;"15,00";"60,00";"-25,00"');
  });

  it("shows the overdue report and exports it", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Inadimplência" }));
    const row = within((await screen.findByText("Ana Ribeiro")).closest("tr")!);
    expect(row.getByText(/R\$\s339,80/)).toBeInTheDocument();
    expect(row.getByText("1 dia")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(lastCsv().csv.split("\r\n")[1]).toBe('Ana Ribeiro;(11) 98888-0001;2;4;"339,80";1');
  });

  it("shows the empty state and the error with retry", async () => {
    let fail = true;
    server.use(
      http.get(`${api}/reports/overdue`, () =>
        fail
          ? HttpResponse.json({ status: 403, code: "FORBIDDEN" }, { status: 403 })
          : HttpResponse.json({ items: [] }),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Inadimplência" }));
    expect(await screen.findByText("Apenas sócios(as) podem ver o dashboard e os relatórios.")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByText("Nenhuma inadimplência. Todas as vendedoras estão em dia."),
    ).toBeInTheDocument();
  });

  it("changes the stale days and opens the piece detail", async () => {
    server.use(
      http.get(`${api}/pieces/p-9`, () => HttpResponse.json(makePiece({ id: "p-9", code: "LU-0009", type: "Colar" }))),
      http.get(`${api}/pieces/p-9/events`, () =>
        HttpResponse.json([makeEvent({ id: "e-1", pieceId: "p-9", stage: "ETIQUETADA", occurredAt: "2026-09-01T12:00:00Z" })]),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "Peças paradas" }));
    expect(await screen.findByText("75 dias")).toBeInTheDocument();
    expect(staleRequests[0].get("days")).toBe("60");

    await user.click(screen.getByRole("combobox", { name: "Dias parados" }));
    await user.click(await screen.findByRole("option", { name: "90 dias" }));
    await waitFor(() => expect(staleRequests[staleRequests.length - 1]?.get("days")).toBe("90"));

    await user.click(screen.getByText("LU-0009"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
