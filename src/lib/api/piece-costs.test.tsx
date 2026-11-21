import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, makePiece } from "@/test/fixtures";
import { server } from "@/test/server";
import { useUpdatePieceCostsMutation } from "./hooks";
import { authTokenStore } from "./http";
import { piecesApi } from "./pieces";
import { createApiQueryClient } from "./query-client";
import { queryKeys } from "./query-keys";

describe("piece costs", () => {
  let bodies: unknown[];

  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    bodies = [];
    server.use(
      http.patch(`${api}/pieces/p-1/costs`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(makePiece({ id: "p-1", code: "LU-0001", factoryCostCents: 2000 }));
      }),
    );
  });

  it("sends only the fields given, keeping null to clear a cost", async () => {
    await piecesApi.updateCosts("p-1", { factoryCostCents: 2000 });
    await piecesApi.updateCosts("p-1", { bathCostCents: null });

    expect(bodies).toEqual([{ factoryCostCents: 2000 }, { bathCostCents: null }]);
  });

  it("puts the returned piece in the cache and refreshes pieces and reports", async () => {
    const queryClient = createApiQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdatePieceCostsMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "p-1", input: { factoryCostCents: 2000 } });
    });

    expect(queryClient.getQueryData(queryKeys.pieces.detail("p-1"))).toMatchObject({ factoryCostCents: 2000 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.pieces.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.reports.all });
  });
});
