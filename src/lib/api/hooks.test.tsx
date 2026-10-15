import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiQueryClient } from "./query-client";
import { usePiecesQuery, useReceivePieceMutation } from "./hooks";
import { piecesApi } from "./pieces";

vi.mock("./pieces", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pieces")>();
  return {
    ...actual,
    piecesApi: {
      ...actual.piecesApi,
      list: vi.fn(),
      receive: vi.fn(),
    },
  };
});

describe("domain query hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refetches piece lists after a successful receive mutation", async () => {
    vi.mocked(piecesApi.list).mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(piecesApi.receive).mockResolvedValue({
      piece: {
        id: "piece-1",
        code: "LU-0001",
        type: "Anel",
        valueCents: 6490,
        status: "FABRICA",
        currentLocation: "Fábrica",
        createdAt: "2026-10-15T12:00:00Z",
        updatedAt: "2026-10-15T12:00:00Z",
      },
      events: [],
    });

    const queryClient = createApiQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({
        pieces: usePiecesQuery(),
        receive: useReceivePieceMutation(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.pieces.isSuccess).toBe(true));
    await act(async () => {
      await result.current.receive.mutateAsync({
        type: "Anel",
        valueCents: 6490,
        stage: "fabrica",
      });
    });

    await waitFor(() => expect(piecesApi.list).toHaveBeenCalledTimes(2));
    queryClient.clear();
  });
});
