import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { createApiQueryClient } from "@/lib/api/query-client";
import { server } from "@/test/server";
import { api, makePiece, pieceList } from "@/test/fixtures";
import Etiquetagem from ".";
import { resizePhoto } from "./photo";

// O jsdom não tem canvas: a redução da foto é simulada; o resto do fluxo (upload e etiquetagem) é real.
vi.mock("./photo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./photo")>();
  return { ...actual, resizePhoto: vi.fn() };
});

const inBath = makePiece({
  id: "p-bath",
  code: "LU-0042",
  type: "Colar",
  valueCents: 12990,
  status: "BANHO_OURO",
  currentLocation: "No banho de ouro",
});

let listRequests: URLSearchParams[];
let uploadKeys: string[];
let uploadAttempts: number;
let uploadFailures: Array<{ status: number; code: string }>;

function renderEtiquetagem() {
  render(
    <QueryClientProvider client={createApiQueryClient()}>
      <MemoryRouter>
        <Toaster />
        <Etiquetagem />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function choosePieceAndPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "LU-0042, Colar" }));
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await user.upload(
    screen.getByTestId("photo-input"),
    new File(["foto-original"], "camera.png", { type: "image/png" }),
  );
}

async function fillDataAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  // Tipo e valor vêm da peça escolhida.
  expect(screen.getByLabelText("Valor de venda (R$)")).toHaveValue("129,90");
  expect(screen.getByText("LU-0042")).toBeInTheDocument();
  await user.clear(screen.getByLabelText("Valor de venda (R$)"));
  await user.type(screen.getByLabelText("Valor de venda (R$)"), "139,90");
  await user.type(screen.getByLabelText("Observação (opcional)"), "Dourado");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await user.click(screen.getByRole("switch", { name: "Peça retornou do banho de ouro" }));
  await user.click(screen.getByRole("button", { name: "Confirmar etiquetagem" }));
}

describe("labeling screen", () => {
  beforeEach(() => {
    authTokenStore.set({ accessToken: "access-1" });
    listRequests = [];
    uploadKeys = [];
    uploadAttempts = 0;
    uploadFailures = [];
    vi.mocked(resizePhoto).mockResolvedValue(
      new File(["foto-reduzida"], "peca.jpg", { type: "image/jpeg" }),
    );
    server.use(
      http.get(`${api}/pieces`, ({ request }) => {
        listRequests.push(new URL(request.url).searchParams);
        return HttpResponse.json(pieceList([inBath]));
      }),
      http.post(`${api}/uploads/piece-photo`, ({ request }) => {
        uploadAttempts += 1;
        uploadKeys.push(request.headers.get("Idempotency-Key") ?? "");
        const failure = uploadFailures.shift();
        if (failure) return HttpResponse.json(failure, { status: failure.status });
        return HttpResponse.json(
          {
            photoId: "photo-1",
            photoUrl: "/api/v1/photos/photo-1",
            width: 320,
            height: 240,
          },
          { status: 201 },
        );
      }),
    );
  });

  it("labels the piece back from the bath, keeping its code and linking the uploaded photo", async () => {
    let labelBody: unknown;
    server.use(
      http.post(`${api}/pieces/label`, async ({ request }) => {
        expect(request.headers.get("Idempotency-Key")).toBeTruthy();
        labelBody = await request.json();
        return HttpResponse.json(
          makePiece({
            ...inBath,
            type: "Colar",
            valueCents: 13990,
            status: "ETIQUETADA",
            currentLocation: "Estoque",
            photoUrl: "/api/v1/photos/photo-1",
          }),
        );
      }),
    );
    const user = userEvent.setup();
    renderEtiquetagem();

    await choosePieceAndPhoto(user);
    expect(
      await screen.findByRole("img", { name: "Foto enviada da peça" }),
    ).toHaveAttribute("src", "/api/v1/photos/photo-1");
    expect(listRequests[0].get("status")).toBe("BANHO_OURO");
    expect(uploadKeys[0]).toBeTruthy();

    await fillDataAndConfirm(user);

    expect(await screen.findByRole("heading", { name: "Peça etiquetada" })).toBeInTheDocument();
    expect(screen.getByText("LU-0042")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto da peça LU-0042" })).toHaveAttribute(
      "src",
      "/api/v1/photos/photo-1",
    );
    // Atualiza a peça existente: manda o id dela, nunca cria uma peça nova.
    expect(labelBody).toEqual({
      sourcePieceId: "p-bath",
      type: "Colar",
      valueCents: 13990,
      photoId: "photo-1",
      note: "Dourado",
      backFromBath: true,
    });
  });

  it("recovers from a failed upload and retries with the same idempotency key", async () => {
    uploadFailures = [{ status: 413, code: "PHOTO_TOO_LARGE" }];
    const user = userEvent.setup();
    renderEtiquetagem();

    await choosePieceAndPhoto(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("A foto passou de 1 MB");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("img", { name: "Foto enviada da peça" })).toBeInTheDocument();
    expect(uploadAttempts).toBe(2);
    expect(uploadKeys[1]).toBe(uploadKeys[0]);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("rejects a non-image file before uploading", async () => {
    // A validação real recusa o arquivo antes de qualquer processamento ou envio.
    const actual = await vi.importActual<typeof import("./photo")>("./photo");
    vi.mocked(resizePhoto).mockImplementation(actual.resizePhoto);
    const user = userEvent.setup({ applyAccept: false });
    renderEtiquetagem();

    await user.click(await screen.findByRole("button", { name: "LU-0042, Colar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.upload(
      screen.getByTestId("photo-input"),
      new File(["%PDF"], "nota.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha uma imagem");
    expect(uploadAttempts).toBe(0);
  });

  it("does not duplicate the labeling when retrying after a network failure", async () => {
    const labelKeys: string[] = [];
    server.use(
      http.post(`${api}/pieces/label`, ({ request }) => {
        labelKeys.push(request.headers.get("Idempotency-Key") ?? "");
        if (labelKeys.length === 1) return HttpResponse.error();
        return HttpResponse.json(
          makePiece({ ...inBath, status: "ETIQUETADA", currentLocation: "Estoque" }),
        );
      }),
    );
    const user = userEvent.setup();
    renderEtiquetagem();

    await choosePieceAndPhoto(user);
    await screen.findByRole("img", { name: "Foto enviada da peça" });
    await fillDataAndConfirm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível conectar");
    expect(screen.queryByRole("heading", { name: "Peça etiquetada" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { name: "Peça etiquetada" })).toBeInTheDocument();
    expect(labelKeys).toHaveLength(2);
    expect(labelKeys[1]).toBe(labelKeys[0]);
  });

  it("sends the user back to pick another piece when it is no longer in the bath", async () => {
    server.use(
      http.post(`${api}/pieces/label`, () =>
        HttpResponse.json({ status: 409, code: "INVALID_PIECE_TRANSITION" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderEtiquetagem();

    await choosePieceAndPhoto(user);
    await screen.findByRole("img", { name: "Foto enviada da peça" });
    await fillDataAndConfirm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta peça não está mais no banho de ouro",
    );
    expect(screen.getByRole("button", { name: "Confirmar etiquetagem" })).toBeDisabled();
    expect(screen.queryByText("Peça etiquetada")).not.toBeInTheDocument();

    const requestsBefore = listRequests.length;
    await user.click(screen.getByRole("button", { name: "Escolher outra peça" }));

    expect(await screen.findByRole("list", { name: "Peças no banho de ouro" })).toBeInTheDocument();
    await waitFor(() => expect(listRequests.length).toBeGreaterThan(requestsBefore));
  });

  it("asks for the photo again when the backend no longer has it", async () => {
    server.use(
      http.post(`${api}/pieces/label`, () =>
        HttpResponse.json({ status: 404, code: "PHOTO_NOT_FOUND" }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderEtiquetagem();

    await choosePieceAndPhoto(user);
    await screen.findByRole("img", { name: "Foto enviada da peça" });
    await fillDataAndConfirm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Envie a foto de novo");
    await user.click(screen.getByRole("button", { name: "Enviar a foto de novo" }));

    expect(await screen.findByText("Fotografar a peça")).toBeInTheDocument();
  });
});
