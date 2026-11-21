import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import type { SellerListItem } from "@/lib/api/types";
import { api } from "@/test/fixtures";
import { server } from "@/test/server";
import Consignacao from ".";

const items: SellerListItem[] = [
  {
    seller: { id: "s-ana", name: "Ana Ribeiro", phone: "(11) 1", commissionRate: 30, status: "ativa" },
    piecesInHand: 2,
    valueInHandCents: 18890,
    nextDueAt: "2026-12-01T02:59:59.999999Z",
    nextDueDays: -2,
    late: true,
    openLots: 1,
  },
  {
    seller: { id: "s-bia", name: "Bia Lima", phone: "(11) 2", commissionRate: 30, status: "INATIVA" },
    piecesInHand: 0,
    valueInHandCents: 0,
    nextDueAt: null,
    nextDueDays: null,
    late: false,
    openLots: 0,
  },
];

function renderPage() {
  render(
    <QueryClientProvider client={createApiQueryClient()}>
      <MemoryRouter initialEntries={["/consignacao"]}>
        <Routes>
          <Route path="/consignacao" element={<Consignacao />} />
          <Route path="/consignacao/:sellerId" element={<p>Página da vendedora</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("consignment sellers list", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    server.use(
      http.get(`${api}/settings`, () =>
        HttpResponse.json({
          commissionMin: 25,
          commissionMax: 40,
          commissionStep: 5,
          defaultCommissionRate: 30,
          paymentTerms: [30],
          defaultConsignmentDays: 30,
          timezone: "America/Sao_Paulo",
        }),
      ),
      http.get(`${api}/sellers`, () =>
        HttpResponse.json({ items, pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 } }),
      ),
    );
  });

  it("shows the aggregates and the late status that come from the API", async () => {
    renderPage();

    const ana = within((await screen.findByText("Ana Ribeiro")).closest("tr")!);
    expect(ana.getByText("2")).toBeInTheDocument();
    expect(ana.getByText(/188,90/)).toBeInTheDocument();
    // Fim do dia 30/11 em São Paulo, mostrado no fuso da loja.
    expect(ana.getByText("30/11/2026")).toBeInTheDocument();
    expect(ana.getByText("há 2 dias")).toBeInTheDocument();
    expect(ana.getByText("Atrasado")).toBeInTheDocument();
    expect(within(screen.getByText("Bia Lima").closest("tr")!).getByText("Inativa")).toBeInTheDocument();
    expect(screen.getByText("2 vendedoras cadastradas")).toBeInTheDocument();
  });

  it("opens the seller page", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Ana Ribeiro"));

    expect(await screen.findByText("Página da vendedora")).toBeInTheDocument();
  });
});
