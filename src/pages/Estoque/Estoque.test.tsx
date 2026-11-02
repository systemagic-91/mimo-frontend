import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { server } from "@/test/server";
import { api, makeEvent, makePiece, pieceList } from "@/test/fixtures";
import Estoque from ".";

const anel = makePiece({ id: "p-1", code: "LU-0001", type: "Anel", valueCents: 6490 });
const colar = makePiece({
  id: "p-2",
  code: "LU-0002",
  type: "Colar",
  valueCents: 12990,
  status: "BANHO_OURO",
  currentLocation: "No banho de ouro",
});

let listRequests: URLSearchParams[];

function renderEstoque() {
  render(
    <QueryClientProvider client={createApiQueryClient()}>
      <MemoryRouter>
        <Toaster />
        <Estoque />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const lastList = () => listRequests[listRequests.length - 1];

describe("inventory screen", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access-1" });
    listRequests = [];
    server.use(
      http.get(`${api}/pieces`, ({ request }) => {
        listRequests.push(new URL(request.url).searchParams);
        // 120 peças no filtro: o resumo vem da API, não da soma desta página.
        return HttpResponse.json(
          pieceList([anel, colar], { total: 120, totalValueCents: 1_234_500, totalPages: 3 }),
        );
      }),
    );
  });

  it("shows the filtered count and total value from the API summary", async () => {
    renderEstoque();

    expect(await screen.findByText("LU-0001")).toBeInTheDocument();
    expect(screen.getByText(/120 peças · R\$\s12\.345,00/)).toBeInTheDocument();
    expect(screen.getByText(/129,90/)).toBeInTheDocument();
    expect(screen.getByText("No banho de ouro", { selector: "span" })).toBeInTheDocument();
    expect(lastList().get("page")).toBe("1");
    expect(lastList().get("pageSize")).toBe("50");
    expect(lastList().getAll("sort")).toEqual(["code,asc"]);
  });

  it("sends search, status filter, sort and page to the API", async () => {
    const user = userEvent.setup();
    renderEstoque();
    await screen.findByText("LU-0001");

    await user.type(screen.getByLabelText("Buscar peças"), "anel");
    await waitFor(() => expect(lastList().get("q")).toBe("anel"));
    expect(lastList().get("page")).toBe("1");

    await user.click(screen.getByLabelText("Filtrar por status"));
    await user.click(await screen.findByRole("option", { name: "No banho de ouro" }));
    await waitFor(() => expect(lastList().get("status")).toBe("BANHO_OURO"));

    await user.click(screen.getByRole("button", { name: "Valor" }));
    await waitFor(() =>
      expect(lastList().getAll("sort")).toEqual(["valueCents,asc", "code,asc"]),
    );
    await user.click(screen.getByRole("button", { name: "Valor" }));
    await waitFor(() =>
      expect(lastList().getAll("sort")).toEqual(["valueCents,desc", "code,asc"]),
    );

    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(lastList().get("page")).toBe("2"));
    expect(lastList().get("q")).toBe("anel");
    expect(lastList().get("status")).toBe("BANHO_OURO");
  });

  it("receives a piece once even when the first attempt fails, and shows the server code and status", async () => {
    const keys: string[] = [];
    let attempts = 0;
    const created = makePiece({
      id: "p-new",
      code: "LU-0813",
      type: "Brinco",
      valueCents: 8490,
      status: "BANHO_OURO",
      currentLocation: "No banho de ouro",
    });
    server.use(
      http.get(`${api}/pieces/next-code`, () => HttpResponse.json({ code: "LU-0812" })),
      http.post(`${api}/pieces/receive`, async ({ request }) => {
        attempts += 1;
        keys.push(request.headers.get("Idempotency-Key") ?? "");
        expect(await request.json()).toEqual({
          type: "Brinco",
          valueCents: 8490,
          stage: "FABRICA",
        });
        // A primeira tentativa cai na rede; a segunda (mesma chave) é atendida.
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json(
          { piece: created, events: [] },
          { status: 201 },
        );
      }),
      http.get(`${api}/pieces/p-new`, () => HttpResponse.json(created)),
      http.get(`${api}/pieces/p-new/events`, () =>
        HttpResponse.json([
          makeEvent({ id: "e-1", pieceId: "p-new", stage: "FABRICA", occurredAt: "2026-10-31T12:00:00.000Z" }),
        ]),
      ),
    );
    const user = userEvent.setup();
    renderEstoque();
    await screen.findByText("LU-0001");

    await user.click(screen.getByRole("button", { name: "Receber peça" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("LU-0812")).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Valor de venda (R$)"), "84,90");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recebimento" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor",
    );
    expect(screen.queryByText("Peça recebida")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Peça recebida")).toBeInTheDocument();
    expect(screen.getByText("LU-0813 registrada como No banho de ouro.")).toBeInTheDocument();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    // Abre o detalhe da peça criada, com os dados do servidor.
    expect(await screen.findByRole("heading", { name: "LU-0813" })).toBeInTheDocument();
  });

  it("validates the value locally and shows API validation errors without a false success", async () => {
    server.use(
      http.get(`${api}/pieces/next-code`, () => HttpResponse.json({ code: "LU-0812" })),
      http.post(`${api}/pieces/receive`, () =>
        HttpResponse.json(
          { status: 400, code: "VALIDATION_ERROR", fields: { type: ["inválido"] } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderEstoque();
    await screen.findByText("LU-0001");

    await user.click(screen.getByRole("button", { name: "Receber peça" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Valor de venda (R$)"), "0");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recebimento" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("maior que zero");

    await user.clear(within(dialog).getByLabelText("Valor de venda (R$)"));
    await user.type(within(dialog).getByLabelText("Valor de venda (R$)"), "84,90");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recebimento" }));
    expect(await within(dialog).findByText("Escolha um tipo de peça válido.")).toBeInTheDocument();
    expect(screen.queryByText("Peça recebida")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the piece detail with the photo and the timeline in stable order", async () => {
    const detailed = makePiece({
      id: "p-1",
      code: "LU-0001",
      type: "Anel",
      valueCents: 6490,
      photoUrl: "/api/v1/photos/photo-1",
      note: "Dourado",
    });
    server.use(
      http.get(`${api}/pieces/p-1`, () => HttpResponse.json(detailed)),
      // Fora de ordem de propósito; dois eventos no mesmo instante desempatam pelo id.
      http.get(`${api}/pieces/p-1/events`, () =>
        HttpResponse.json([
          makeEvent({ id: "e-3", pieceId: "p-1", stage: "ETIQUETADA", occurredAt: "2026-10-03T12:00:00.000Z" }),
          makeEvent({ id: "e-2", pieceId: "p-1", stage: "BANHO_OURO", occurredAt: "2026-10-01T12:00:00.000Z" }),
          makeEvent({ id: "e-1", pieceId: "p-1", stage: "FABRICA", occurredAt: "2026-10-01T12:00:00.000Z" }),
        ]),
      ),
    );
    const user = userEvent.setup();
    renderEstoque();

    await user.click(await screen.findByRole("button", { name: "Ver peça LU-0001" }));

    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByRole("img", { name: "Foto da peça LU-0001" })).toHaveAttribute(
      "src",
      "/api/v1/photos/photo-1",
    );
    expect(within(sheet).getByText("Dourado")).toBeInTheDocument();
    const timeline = await within(sheet).findByRole("list", { name: "Linha do tempo" });
    const stages = within(timeline)
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");
    expect(stages).toHaveLength(3);
    expect(stages[0]).toMatch(/^Na fábrica/);
    expect(stages[1]).toMatch(/^No banho de ouro/);
    expect(stages[2]).toMatch(/^Etiquetada/);
  });

  it("explains a missing piece in the detail and lets the user retry", async () => {
    server.use(
      http.get(`${api}/pieces/p-1`, () =>
        HttpResponse.json({ status: 404, code: "PIECE_NOT_FOUND" }, { status: 404 }),
      ),
      http.get(`${api}/pieces/p-1/events`, () =>
        HttpResponse.json({ status: 404, code: "PIECE_NOT_FOUND" }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderEstoque();

    await user.click(await screen.findByRole("button", { name: "Ver peça LU-0001" }));

    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText(/Esta peça não foi encontrada/)).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("shows a retryable error when the list fails", async () => {
    server.use(
      http.get(`${api}/pieces`, () =>
        HttpResponse.json({ status: 500, code: "INTERNAL_ERROR" }, { status: 500 }),
      ),
    );
    renderEstoque();

    expect(
      await screen.findByText(/O servidor não conseguiu concluir a operação/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
