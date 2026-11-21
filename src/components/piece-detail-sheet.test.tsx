import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import type { PieceDto, UpdatePieceCostsRequest, UserRole } from "@/lib/api/types";
import { api, makePiece, setCurrentUser } from "@/test/fixtures";
import { server } from "@/test/server";
import { PieceDetailSheet } from "./piece-detail-sheet";

let piece: PieceDto;
let patches: UpdatePieceCostsRequest[];

function renderSheet(role: UserRole) {
  const queryClient = createApiQueryClient();
  setCurrentUser(queryClient, role);
  render(
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <PieceDetailSheet pieceId="p-1" open onOpenChange={() => undefined} />
    </QueryClientProvider>,
  );
}

async function costsBlock() {
  return within((await screen.findByText("Custos")).closest("div.rounded-lg") as HTMLElement);
}

describe("piece detail costs", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    patches = [];
    piece = makePiece({
      id: "p-1",
      code: "LU-0001",
      factoryCostCents: 2000,
      bathCostCents: null,
      totalCostCents: 2000,
    });
    server.use(
      http.get(`${api}/pieces/p-1`, () => HttpResponse.json(piece)),
      http.get(`${api}/pieces/p-1/events`, () => HttpResponse.json([])),
      http.patch(`${api}/pieces/p-1/costs`, async ({ request }) => {
        const body = (await request.json()) as UpdatePieceCostsRequest;
        patches.push(body);
        const factory = "factoryCostCents" in body ? body.factoryCostCents : piece.factoryCostCents;
        const bath = "bathCostCents" in body ? body.bathCostCents : piece.bathCostCents;
        piece = {
          ...piece,
          factoryCostCents: factory,
          bathCostCents: bath,
          totalCostCents: factory == null && bath == null ? null : (factory ?? 0) + (bath ?? 0),
        };
        return HttpResponse.json(piece);
      }),
    );
  });

  it("shows the costs to the owner, with 'não informado' for null and zero as a value", async () => {
    piece = { ...piece, bathCostCents: 0 };
    renderSheet("owner");

    const block = await costsBlock();
    expect(within(block.getByText("Fábrica").parentElement!).getByText(/R\$\s20,00/)).toBeInTheDocument();
    expect(within(block.getByText("Banho").parentElement!).getByText(/R\$\s0,00/)).toBeInTheDocument();
    expect(within(block.getByText("Total").parentElement!).getByText(/R\$\s20,00/)).toBeInTheDocument();
  });

  it("sends only the changed cost", async () => {
    const user = userEvent.setup();
    renderSheet("owner");
    expect(within((await costsBlock()).getByText("Banho").parentElement!).getByText("não informado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar custos" }));
    expect(screen.getByLabelText("Custo da fábrica (R$)")).toHaveValue("20,00");
    await user.type(screen.getByLabelText("Custo do banho (R$)"), "5");
    await user.click(screen.getByRole("button", { name: "Salvar custos" }));

    expect(await screen.findByText("Custos atualizados")).toBeInTheDocument();
    expect(patches).toEqual([{ bathCostCents: 500 }]);
    const block = await costsBlock();
    expect(within(block.getByText("Total").parentElement!).getByText(/R\$\s25,00/)).toBeInTheDocument();
  });

  it("sends null when the owner clears a cost, and nothing when nothing changed", async () => {
    const user = userEvent.setup();
    renderSheet("owner");
    await costsBlock();

    await user.click(screen.getByRole("button", { name: "Editar custos" }));
    await user.click(screen.getByRole("button", { name: "Salvar custos" }));
    expect(patches).toEqual([]);

    await user.click(await screen.findByRole("button", { name: "Editar custos" }));
    await user.clear(screen.getByLabelText("Custo da fábrica (R$)"));
    await user.click(screen.getByRole("button", { name: "Salvar custos" }));

    expect(await screen.findByText("Custos atualizados")).toBeInTheDocument();
    expect(patches).toEqual([{ factoryCostCents: null }]);
  });

  it("does not show costs to staff", async () => {
    piece = { ...piece, factoryCostCents: null, bathCostCents: null, totalCostCents: null };
    renderSheet("staff");

    expect(await screen.findByText("Localização")).toBeInTheDocument();
    expect(screen.queryByText("Custos")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar custos" })).not.toBeInTheDocument();
  });
});
