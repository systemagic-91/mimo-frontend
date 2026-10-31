// @vitest-environment node

import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  authTokenStore,
  ApiError,
  buildQueryString,
  refreshSession,
} from "./http";
import { server } from "@/test/server";

const api = "http://localhost:8080/api/v1";

describe("shared API client", () => {
  it("serializes array query parameters as repeated values", () => {
    expect(
      buildQueryString({ sort: ["updatedAt,desc", "code,asc"], q: "Anel & colar" }),
    ).toBe("?sort=updatedAt%2Cdesc&sort=code%2Casc&q=Anel+%26+colar");
  });

  it("serializes JSON and attaches the in-memory bearer token", async () => {
    authTokenStore.set({ accessToken: "access-1" });
    server.use(
      http.post(`${api}/pieces/receive`, async ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer access-1");
        expect(request.headers.get("Content-Type")).toContain("application/json");
        expect(request.headers.get("Idempotency-Key")).toBeTruthy();
        expect(await request.json()).toEqual({ type: "Anel" });
        return HttpResponse.json({ accepted: true }, { status: 201 });
      }),
    );

    await expect(
      apiRequest<{ accepted: boolean }>("/pieces/receive", {
        method: "POST",
        body: { type: "Anel" },
      }),
    ).resolves.toEqual({ accepted: true });
  });

  it("returns undefined for 204 responses", async () => {
    server.use(
      http.post(
        `${api}/auth/logout`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(
      apiRequest<void>("/auth/logout", {
        method: "POST",
        authenticated: false,
      }),
    ).resolves.toBeUndefined();
  });

  it("preserves RFC 7807 status, stable code, request id, and field errors", async () => {
    server.use(
      http.get(`${api}/pieces`, () =>
        HttpResponse.json(
          {
            type: "https://api.luma.com.br/problems/invalid-piece",
            title: "Peça inválida",
            status: 422,
            detail: "O valor precisa ser positivo.",
            code: "INVALID_PIECE",
            requestId: "req-123",
            fields: { valueCents: ["must be positive"] },
          },
          {
            status: 422,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );

    await expect(apiRequest("/pieces")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      code: "INVALID_PIECE",
      requestId: "req-123",
      fields: { valueCents: ["must be positive"] },
    });
  });

  it("refreshes once after 401 and retries with the new access token", async () => {
    authTokenStore.set({ accessToken: "expired" });
    let apiAttempts = 0;
    let refreshAttempts = 0;
    server.use(
      http.get(`${api}/pieces`, ({ request }) => {
        apiAttempts += 1;
        if (request.headers.get("Authorization") === "Bearer expired") {
          return HttpResponse.json(
            { status: 401, code: "UNAUTHENTICATED", title: "Unauthorized" },
            { status: 401 },
          );
        }
        return HttpResponse.json({ items: [] });
      }),
      http.post(`${api}/auth/refresh`, async ({ request }) => {
        refreshAttempts += 1;
        expect(await request.text()).toBe("");
        expect(request.headers.get("Authorization")).toBeNull();
        return HttpResponse.json({ accessToken: "fresh" });
      }),
    );

    await expect(apiRequest("/pieces")).resolves.toEqual({ items: [] });
    expect(apiAttempts).toBe(2);
    expect(refreshAttempts).toBe(1);
    expect(authTokenStore.getAccessToken()).toBe("fresh");
  });

  it("notifies the configured unauthorized handler when refresh fails", async () => {
    authTokenStore.set({ accessToken: "expired" });
    const onUnauthorized = vi.fn();
    authTokenStore.setUnauthorizedHandler(onUnauthorized);
    server.use(
      http.get(`${api}/pieces`, () =>
        HttpResponse.json(
          { status: 401, code: "UNAUTHENTICATED" },
          { status: 401 },
        ),
      ),
      http.post(`${api}/auth/refresh`, () =>
        HttpResponse.json(
          { status: 401, code: "INVALID_REFRESH_TOKEN" },
          { status: 401 },
        ),
      ),
    );

    await expect(apiRequest("/pieces")).rejects.toBeInstanceOf(ApiError);
    expect(authTokenStore.getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("renews only once when several requests expire at the same time", async () => {
    authTokenStore.set({ accessToken: "expired" });
    let refreshAttempts = 0;
    server.use(
      http.get(`${api}/pieces`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer expired"
          ? HttpResponse.json({ status: 401 }, { status: 401 })
          : HttpResponse.json({ items: [] }),
      ),
      http.post(`${api}/auth/refresh`, async () => {
        refreshAttempts += 1;
        await delay(20);
        return HttpResponse.json({ accessToken: "fresh" });
      }),
    );

    await Promise.all([apiRequest("/pieces"), apiRequest("/pieces"), apiRequest("/pieces")]);
    expect(refreshAttempts).toBe(1);
  });

  it("serializes session renewals across tabs with a Web Lock", async () => {
    const order: string[] = [];
    const locks = {
      request: vi.fn(async (_name: string, action: () => Promise<unknown>) => {
        order.push("lock");
        const result = await action();
        order.push("unlock");
        return result;
      }),
    };
    vi.stubGlobal("navigator", { locks });
    server.use(
      http.post(`${api}/auth/refresh`, () => {
        order.push("refresh");
        return HttpResponse.json({ accessToken: "fresh" });
      }),
    );

    try {
      await expect(refreshSession()).resolves.toEqual({ accessToken: "fresh" });
    } finally {
      vi.unstubAllGlobals();
    }
    expect(locks.request).toHaveBeenCalledWith("luma-session-refresh", expect.any(Function));
    expect(order).toEqual(["lock", "refresh", "unlock"]);
  });

  it("enforces the configured request timeout", async () => {
    server.use(
      http.get(`${api}/slow`, async () => {
        await delay(50);
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      apiRequest("/slow", { authenticated: false, timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT", status: 408 });
  });

  it("propagates caller cancellation without converting it to an API error", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      apiRequest("/cancelled", {
        authenticated: false,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
