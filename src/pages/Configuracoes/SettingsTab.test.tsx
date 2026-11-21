import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { SettingsDto } from "@/lib/api/types";
import { api } from "@/test/fixtures";
import { server } from "@/test/server";
import { SettingsTab } from "./SettingsTab";

let settings: SettingsDto;

function renderTab() {
  const queryClient = createApiQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <SettingsTab />
    </QueryClientProvider>,
  );
  return queryClient;
}

function termCheckbox(days: number) {
  return screen.getByRole("checkbox", { name: `${days} dias` });
}

describe("settings tab", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access-owner" });
    settings = {
      commissionMin: 25,
      commissionMax: 40,
      commissionStep: 5,
      defaultCommissionRate: 35,
      paymentTerms: [30, 60],
      defaultConsignmentDays: 45,
      timezone: "America/Sao_Paulo",
      updatedAt: "2026-10-01T12:00:00Z",
    };
    server.use(http.get(`${api}/settings`, () => HttpResponse.json(settings)));
  });

  it("fills the form from GET /settings", async () => {
    renderTab();

    expect(await screen.findByLabelText("Prazo padrão da consignação (dias)")).toHaveValue(45);
    expect(screen.getByRole("combobox", { name: "Comissão padrão para novas vendedoras" })).toHaveTextContent("35%");
    expect(termCheckbox(30)).toBeChecked();
    expect(termCheckbox(60)).toBeChecked();
    expect(termCheckbox(90)).not.toBeChecked();
    expect(screen.getByText(/25% a 40% em passos de 5%/)).toBeInTheDocument();
  });

  it("shows a load error with retry", async () => {
    let fail = true;
    server.use(
      http.get(`${api}/settings`, () =>
        fail
          ? HttpResponse.json({ status: 500, code: "INTERNAL_ERROR" }, { status: 500 })
          : HttpResponse.json(settings),
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
    expect(await screen.findByLabelText("Prazo padrão da consignação (dias)")).toHaveValue(45);
  });

  it("always sends the four fields and invalidates settings and sellers", async () => {
    let body: unknown;
    server.use(
      http.patch(`${api}/settings`, async ({ request }) => {
        body = await request.json();
        settings = { ...settings, paymentTerms: [30, 60, 90], updatedAt: "2026-11-21T12:00:00Z" };
        return HttpResponse.json(settings);
      }),
    );
    const user = userEvent.setup();
    const queryClient = renderTab();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await screen.findByLabelText("Prazo padrão da consignação (dias)");

    await user.click(termCheckbox(90));
    await user.click(screen.getByRole("button", { name: "Salvar parâmetros" }));

    expect(await screen.findByText("Parâmetros salvos.")).toBeInTheDocument();
    expect(body).toEqual({
      defaultCommissionRate: 35,
      paymentTerms: [30, 60, 90],
      defaultConsignmentDays: 45,
      timezone: "America/Sao_Paulo",
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.settings.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.sellers.all });
    await waitFor(() => expect(termCheckbox(90)).toBeChecked());
  });

  it("explains that removing a term only affects new lots", async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByLabelText("Prazo padrão da consignação (dias)");

    await user.click(termCheckbox(60));

    expect(screen.getByText(/Ao salvar, 60 dias deixam de aparecer nos lotes novos/)).toBeInTheDocument();
  });

  it("blocks saving without a payment term or with an invalid consignment period", async () => {
    let called = false;
    server.use(
      http.patch(`${api}/settings`, () => {
        called = true;
        return HttpResponse.json(settings);
      }),
    );
    const user = userEvent.setup();
    renderTab();
    const days = await screen.findByLabelText("Prazo padrão da consignação (dias)");

    await user.click(termCheckbox(30));
    await user.click(termCheckbox(60));
    await user.clear(days);
    await user.type(days, "0");
    await user.click(screen.getByRole("button", { name: "Salvar parâmetros" }));

    expect(screen.getByText("Marque pelo menos um prazo de pagamento.")).toBeInTheDocument();
    expect(screen.getByText("O prazo da consignação precisa ser de pelo menos 1 dia.")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("shows the API field error next to the field", async () => {
    server.use(
      http.patch(`${api}/settings`, () =>
        HttpResponse.json(
          { status: 400, code: "VALIDATION_ERROR", fields: { defaultCommissionRate: "fora da faixa" } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByLabelText("Prazo padrão da consignação (dias)");

    await user.click(screen.getByRole("button", { name: "Salvar parâmetros" }));

    expect(
      await screen.findByText("Escolha uma comissão padrão dentro da faixa permitida."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Comissão padrão para novas vendedoras" }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for confirmation before changing the timezone", async () => {
    let body: { timezone?: string } | undefined;
    server.use(
      http.patch(`${api}/settings`, async ({ request }) => {
        body = (await request.json()) as { timezone?: string };
        settings = { ...settings, timezone: "America/Manaus", updatedAt: "2026-11-21T12:00:00Z" };
        return HttpResponse.json(settings);
      }),
    );
    const user = userEvent.setup();
    renderTab();
    await screen.findByLabelText("Prazo padrão da consignação (dias)");

    await user.click(screen.getByRole("combobox", { name: "Fuso horário da loja" }));
    await user.click(await screen.findByRole("option", { name: "Manaus (Amazonas)" }));
    await user.click(screen.getByRole("button", { name: "Salvar parâmetros" }));

    const confirm = within(await screen.findByRole("alertdialog"));
    expect(body).toBeUndefined();
    await user.click(confirm.getByRole("button", { name: "Mudar fuso" }));

    expect(await screen.findByText("Parâmetros salvos.")).toBeInTheDocument();
    expect(body?.timezone).toBe("America/Manaus");
  });
});
