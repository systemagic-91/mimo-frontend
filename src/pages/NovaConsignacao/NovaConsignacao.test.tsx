import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import type {
  ConsignmentDetailsDto,
  CreateConsignmentRequest,
  PieceDto,
  SellerListItem,
  SettingsDto,
} from "@/lib/api/types";
import { addDaysToDate, todayInZone } from "@/lib/store-time";
import { api, makePiece, pieceList } from "@/test/fixtures";
import { server } from "@/test/server";
import NovaConsignacao from ".";

const SP = "America/Sao_Paulo";
const settings: SettingsDto = {
  commissionMin: 25,
  commissionMax: 40,
  commissionStep: 5,
  defaultCommissionRate: 30,
  paymentTerms: [30, 60],
  defaultConsignmentDays: 30,
  timezone: SP,
};
const ana: SellerListItem = {
  seller: { id: "s-ana", name: "Ana Ribeiro", phone: "(11) 1", commissionRate: 30, status: "ativa" },
  piecesInHand: 0,
  valueInHandCents: 0,
  late: false,
  openLots: 0,
};

let available: PieceDto[];
let piecesRequests: number;
let posts: { body: CreateConsignmentRequest; key: string | null }[];

function created(body: CreateConsignmentRequest): ConsignmentDetailsDto {
  return {
    id: "c-1",
    code: "C-2026-007",
    sellerId: body.sellerId,
    deliveredAt: "2026-11-21T15:00:00Z",
    dueAt: "2026-12-22T02:59:59.999999Z",
    status: "ABERTA",
    paymentTermDays: body.paymentTermDays,
    late: false,
    seller: ana.seller,
    items: body.pieceIds.map((pieceId, index) => {
      const piece = available.find((p) => p.id === pieceId)!;
      return {
        id: `i-${index}`,
        consignmentId: "c-1",
        pieceId,
        codeSnapshot: piece.code,
        typeSnapshot: piece.type,
        valueCentsSnapshot: piece.valueCents,
        commissionRateSnapshot: 30,
        status: "COM_VENDEDORA",
      };
    }),
  };
}

function renderWizard() {
  render(
    <QueryClientProvider client={createApiQueryClient()}>
      <Toaster />
      <MemoryRouter initialEntries={["/consignacao/nova"]}>
        <Routes>
          <Route path="/consignacao/nova" element={<NovaConsignacao />} />
          <Route path="/consignacao/:sellerId" element={<p>Página da vendedora</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillUntilReview(user: ReturnType<typeof userEvent.setup>, codes = ["LU-0001", "LU-0002"]) {
  await user.click(await screen.findByRole("radio", { name: /Ana Ribeiro/ }));
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  for (const code of codes) {
    await user.click(await screen.findByRole("checkbox", { name: new RegExp(code) }));
  }
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await user.click(await screen.findByRole("radio", { name: "60 dias" }));
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("new consignment wizard", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    available = [
      makePiece({ id: "p-1", code: "LU-0001", valueCents: 8490 }),
      makePiece({ id: "p-2", code: "LU-0002", type: "Colar", valueCents: 12900 }),
      makePiece({ id: "p-3", code: "LU-0003", valueCents: 5000 }),
    ];
    piecesRequests = 0;
    posts = [];
    server.use(
      http.get(`${api}/settings`, () => HttpResponse.json(settings)),
      http.get(`${api}/sellers`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("status")).toBe("ATIVA");
        return HttpResponse.json({ items: [ana], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
      }),
      http.get(`${api}/pieces`, ({ request }) => {
        piecesRequests += 1;
        expect(new URL(request.url).searchParams.get("status")).toBe("ETIQUETADA");
        return HttpResponse.json(pieceList(available));
      }),
      http.post(`${api}/consignments`, async ({ request }) => {
        const body = (await request.json()) as CreateConsignmentRequest;
        posts.push({ body, key: request.headers.get("Idempotency-Key") });
        return HttpResponse.json(created(body), { status: 201 });
      }),
    );
  });

  it("validates each step before moving on", async () => {
    const user = userEvent.setup();
    renderWizard();

    await screen.findByRole("radio", { name: /Ana Ribeiro/ });
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Ana Ribeiro/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByRole("checkbox", { name: /LU-0001/ });
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /LU-0001/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    // Com dois prazos, nenhum vem escolhido.
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Escolha o prazo de pagamento.")).toBeInTheDocument();
    expect(screen.getByLabelText("Prazo de devolução")).toHaveValue(addDaysToDate(todayInZone(SP), 30));
  });

  it("creates the lot and shows what the server returned, ready to print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderWizard();

    await fillUntilReview(user);
    expect(screen.getByText("60 dias")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));

    expect(await screen.findByText(/entregue$/)).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({
      sellerId: "s-ana",
      pieceIds: ["p-1", "p-2"],
      dueDate: addDaysToDate(todayInZone(SP), 30),
      paymentTermDays: 60,
    });
    expect(posts[0].key).toBeTruthy();
    expect(screen.getAllByText("C-2026-007").length).toBeGreaterThan(0);
    // O romaneio usa os snapshots devolvidos.
    expect(screen.getByText("Relatório de itens entregues")).toBeInTheDocument();
    expect(screen.getByText("Lote C-2026-007 · Consignação")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Imprimir romaneio" }));
    expect(print).toHaveBeenCalled();

    await user.click(screen.getByRole("link", { name: "Ver lotes da vendedora" }));
    expect(await screen.findByText("Página da vendedora")).toBeInTheDocument();
  });

  it("reuses the idempotency key when confirming again after a network failure", async () => {
    let calls = 0;
    server.use(
      http.post(`${api}/consignments`, async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as CreateConsignmentRequest;
        posts.push({ body, key: request.headers.get("Idempotency-Key") });
        if (calls === 1) return HttpResponse.error();
        return HttpResponse.json(created(body), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWizard();

    await fillUntilReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));
    expect(await screen.findByText(/Não foi possível conectar/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));

    expect(await screen.findByText(/entregue$/)).toBeInTheDocument();
    expect(posts).toHaveLength(2);
    expect(posts[1].key).toBe(posts[0].key);
  });

  it("drops unavailable pieces from the selection and reloads the list on 409", async () => {
    server.use(
      http.post(`${api}/consignments`, () =>
        HttpResponse.json(
          {
            status: 409,
            code: "PIECE_NOT_AVAILABLE",
            detail: "Estas peças não estão disponíveis no estoque: LU-0002.",
            fields: { pieceIds: ["p-2"] },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWizard();

    await fillUntilReview(user);
    const before = piecesRequests;
    available = available.filter((piece) => piece.id !== "p-2");
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));

    expect(
      await screen.findByText("LU-0002 não está mais disponível e foi tirada da seleção."),
    ).toBeInTheDocument();
    const selected = within(screen.getByRole("list", { name: "Peças selecionadas" }));
    expect(selected.getByText("LU-0001")).toBeInTheDocument();
    expect(selected.queryByText("LU-0002")).not.toBeInTheDocument();
    await waitFor(() => expect(piecesRequests).toBeGreaterThan(before));
    expect(screen.queryByRole("checkbox", { name: /LU-0002/ })).not.toBeInTheDocument();
  });

  it("goes back to the seller step when the seller became inactive", async () => {
    server.use(
      http.post(`${api}/consignments`, () =>
        HttpResponse.json({ status: 422, code: "SELLER_INACTIVE" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderWizard();

    await fillUntilReview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));

    expect(await screen.findByText(/Esta vendedora está inativa/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Ana Ribeiro/ })).toHaveAttribute("aria-checked", "false");
  });
});
