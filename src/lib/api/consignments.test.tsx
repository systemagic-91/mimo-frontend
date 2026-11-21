import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/test/fixtures";
import { server } from "@/test/server";
import { consignmentsApi } from "./consignments";
import { useMarkItemSoldMutation } from "./hooks";
import { authTokenStore } from "./http";
import { createApiQueryClient } from "./query-client";
import { queryKeys } from "./query-keys";
import { sellersApi } from "./sellers";
import type { ConsignmentDetailsDto } from "./types";

const details: ConsignmentDetailsDto = {
  id: "c-1",
  code: "C-2026-001",
  sellerId: "s-1",
  deliveredAt: "2026-11-01T15:00:00Z",
  dueAt: "2026-12-01T02:59:59.999999Z",
  status: "ABERTA",
  paymentTermDays: 30,
  late: false,
  seller: { id: "s-1", name: "Ana", phone: "1", commissionRate: 30, status: "ativa" },
  items: [],
};

describe("consignment item actions and payment schedule", () => {
  let bodies: unknown[];

  beforeEach(() => {
    authTokenStore.set({ accessToken: "access" });
    bodies = [];
    server.use(
      http.post(`${api}/consignments/c-1/items/:pieceId/:action`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(details);
      }),
    );
  });

  it("sends the optional date in the field of each action", async () => {
    await consignmentsApi.markSold("c-1", "p-1");
    await consignmentsApi.markSold("c-1", "p-1", { at: "2026-11-10T02:59:59.000Z", note: "Pix" });
    await consignmentsApi.markReturned("c-1", "p-1", { at: "2026-11-10T02:59:59.000Z" });

    expect(bodies).toEqual([
      {},
      { soldAt: "2026-11-10T02:59:59.000Z", note: "Pix" },
      { returnedAt: "2026-11-10T02:59:59.000Z" },
    ]);
  });

  it("asks the payment schedule for the period", async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${api}/sellers/s-1/payment-schedule`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({ groups: [], totalDueCents: 0 });
      }),
    );

    await expect(sellersApi.paymentSchedule("s-1", "2026-11-01", "2026-11-30")).resolves.toEqual({
      groups: [],
      totalDueCents: 0,
    });
    expect(url?.searchParams.get("from")).toBe("2026-11-01");
    expect(url?.searchParams.get("to")).toBe("2026-11-30");
  });

  it("puts the returned lot in the cache and invalidates the operational data", async () => {
    const queryClient = createApiQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMarkItemSoldMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ consignmentId: "c-1", pieceId: "p-1" });
    });

    expect(queryClient.getQueryData(queryKeys.consignments.detail("c-1"))).toEqual(details);
    for (const key of [
      queryKeys.pieces.all,
      queryKeys.sellers.all,
      queryKeys.consignments.all,
      queryKeys.dashboard.all,
      queryKeys.reports.all,
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    }
  });
});
