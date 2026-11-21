import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { DashboardResponse, UserRole } from "@/lib/api/types";
import { api } from "@/test/fixtures";
import { server } from "@/test/server";
import Dashboard from ".";

let dashboard: DashboardResponse;
let dashboardCalls: number;

function renderDashboard(role: UserRole = "owner") {
  const queryClient = createApiQueryClient();
  queryClient.setQueryData(queryKeys.auth.me(), {
    user: {
      id: "u-1",
      name: "Bia",
      email: "bia@luma.com.br",
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
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/consignacao/:sellerId" element={<p>Página da vendedora</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("dashboard", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    dashboardCalls = 0;
    dashboard = {
      kpis: {
        activeInHand: 5,
        activeInHandValueCents: 41200,
        avgTurnoverDays: 18,
        staleCount: 2,
        staleValueCents: 23390,
        overdueSellers: 1,
      },
      stageCounts: { fabrica: 2, banho_ouro: 3, etiquetada: 7, consignacao: 5, vendida: 4, devolvida: 0 },
      openConsignments: [
        {
          id: "c-1",
          code: "C-2026-002",
          sellerId: "s-ana",
          deliveredAt: "2026-10-01T15:00:00Z",
          dueAt: "2026-11-20T02:59:59.999999Z",
          dueInDays: -2,
          status: "atrasada",
          paymentTermDays: 30,
          seller: { id: "s-ana", name: "Ana Ribeiro", phone: "1", commissionRate: 30, status: "ativa" },
          piecesInHand: 3,
          valueInHandCents: 25470,
        },
      ],
      overdueSellers: [
        {
          sellerId: "s-ana",
          sellerName: "Ana Ribeiro",
          phone: "1",
          lateLots: 1,
          piecesInHand: 3,
          valueAtRiskCents: 25470,
          maxOverdueDays: 2,
        },
      ],
    };
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
      http.get(`${api}/dashboard`, () => {
        dashboardCalls += 1;
        return HttpResponse.json(dashboard);
      }),
    );
  });

  it("shows the KPIs, stage counts and open lots from GET /dashboard, converting cents", async () => {
    renderDashboard();

    expect(await screen.findByText("18 dias")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s412,00 em posse das vendedoras/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s233,90 parados em estoque/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s254,70 em risco/)).toBeInTheDocument();
    expect(screen.getByText("Etiquetada").previousSibling).toHaveTextContent("7");
    const row = within(screen.getByText("C-2026-002").closest("tr")!);
    expect(row.getByText("Ana Ribeiro")).toBeInTheDocument();
    expect(row.getByText("19/11/2026")).toBeInTheDocument();
    expect(row.getByText("há 2 dias")).toBeInTheDocument();
    expect(row.getByText("Atrasado")).toBeInTheDocument();
    expect(dashboardCalls).toBe(1);
  });

  it("shows a dash when there were no sales in the last 90 days", async () => {
    dashboard = { ...dashboard, kpis: { ...dashboard.kpis, avgTurnoverDays: null } };
    renderDashboard();
    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("opens the seller page from an open lot", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(await screen.findByText("C-2026-002"));
    expect(await screen.findByText("Página da vendedora")).toBeInTheDocument();
  });

  it("shows the error with retry", async () => {
    let fail = true;
    server.use(
      http.get(`${api}/dashboard`, () =>
        fail ? HttpResponse.json({ status: 403, code: "FORBIDDEN" }, { status: 403 }) : HttpResponse.json(dashboard),
      ),
    );
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText("Apenas sócios(as) podem ver o dashboard e os relatórios.")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("18 dias")).toBeInTheDocument();
  });

  it("does not call the dashboard for staff", async () => {
    renderDashboard("staff");
    expect(await screen.findByText("Carregando…")).toBeInTheDocument();
    expect(dashboardCalls).toBe(0);
  });
});
