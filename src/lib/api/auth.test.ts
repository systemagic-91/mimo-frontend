// @vitest-environment node

import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { authApi } from "./auth";
import { authTokenStore } from "./http";

const api = "http://localhost:8080/api/v1";

const authResponse = {
  user: {
    id: "user-1",
    name: "Conta",
    email: "user@example.com",
    role: "owner",
  },
  session: {
    loggedAt: "2026-10-15T12:00:00Z",
    expiresAt: "2026-10-15T12:15:00Z",
  },
  accessToken: "access-1",
};

describe("authentication API", () => {
  it("logs in and keeps only the access token in memory", async () => {
    server.use(
      http.post(`${api}/auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "user@example.com",
          password: "correct-password",
        });
        return HttpResponse.json(authResponse, {
          headers: { "Set-Cookie": "luma_refresh=secret; HttpOnly; Path=/api/v1/auth" },
        });
      }),
    );

    await expect(
      authApi.login("user@example.com", "correct-password"),
    ).resolves.toEqual(authResponse);
    expect(authTokenStore.getAccessToken()).toBe("access-1");
    expect("getRefreshToken" in authTokenStore).toBe(false);
  });

  it("restores the session from the cookie with an empty refresh request", async () => {
    server.use(
      http.post(`${api}/auth/refresh`, async ({ request }) => {
        expect(await request.text()).toBe("");
        return HttpResponse.json({ ...authResponse, accessToken: "access-2" });
      }),
      http.get(`${api}/auth/me`, ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer access-2");
        return HttpResponse.json({
          user: authResponse.user,
          session: authResponse.session,
        });
      }),
    );

    await expect(authApi.refresh()).resolves.toMatchObject({ accessToken: "access-2" });
    await expect(authApi.me()).resolves.toEqual({
      user: authResponse.user,
      session: authResponse.session,
    });
  });

  it("reports a missing session as null when the refresh returns 401", async () => {
    await expect(authApi.refresh()).resolves.toBeNull();
    expect(authTokenStore.getAccessToken()).toBeNull();
  });

  it("logs out without a body or bearer token, even with an expired access token", async () => {
    authTokenStore.set({ accessToken: "expired" });
    let logoutAttempts = 0;
    server.use(
      http.post(`${api}/auth/logout`, async ({ request }) => {
        logoutAttempts += 1;
        expect(request.headers.get("Authorization")).toBeNull();
        expect(await request.text()).toBe("");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await authApi.logout();

    expect(logoutAttempts).toBe(1);
    expect(authTokenStore.getAccessToken()).toBeNull();
  });

  it("changes the password and ends the in-memory session", async () => {
    authTokenStore.set({ accessToken: "access-1" });
    server.use(
      http.post(`${api}/auth/change-password`, async ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer access-1");
        expect(request.headers.get("Idempotency-Key")).toBeNull();
        expect(await request.json()).toEqual({
          currentPassword: "temporaria-123",
          newPassword: "nova-senha-segura",
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await authApi.changePassword({
      currentPassword: "temporaria-123",
      newPassword: "nova-senha-segura",
    });

    expect(authTokenStore.getAccessToken()).toBeNull();
  });

  it("reports a wrong current password without renewing or dropping the session", async () => {
    authTokenStore.set({ accessToken: "access-1" });
    const onUnauthorized = vi.fn();
    authTokenStore.setUnauthorizedHandler(onUnauthorized);
    let refreshAttempts = 0;
    server.use(
      http.post(`${api}/auth/change-password`, () =>
        HttpResponse.json(
          { status: 401, code: "INVALID_CREDENTIALS" },
          { status: 401 },
        ),
      ),
      http.post(`${api}/auth/refresh`, () => {
        refreshAttempts += 1;
        return HttpResponse.json({ accessToken: "access-2" });
      }),
    );

    await expect(
      authApi.changePassword({ currentPassword: "errada", newPassword: "nova-senha-segura" }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
    expect(refreshAttempts).toBe(0);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(authTokenStore.getAccessToken()).toBe("access-1");
  });

  it("renews an expired access token once before changing the password", async () => {
    authTokenStore.set({ accessToken: "expired" });
    server.use(
      http.post(`${api}/auth/change-password`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer expired"
          ? HttpResponse.json({ status: 401, code: "INVALID_ACCESS_TOKEN" }, { status: 401 })
          : new HttpResponse(null, { status: 204 }),
      ),
      http.post(`${api}/auth/refresh`, () =>
        HttpResponse.json({ ...authResponse, accessToken: "fresh" }),
      ),
    );

    await expect(
      authApi.changePassword({ currentPassword: "atual-123456", newPassword: "nova-senha-segura" }),
    ).resolves.toBeUndefined();
    expect(authTokenStore.getAccessToken()).toBeNull();
  });

  it("clears the in-memory session even when the logout request fails", async () => {
    authTokenStore.set({ accessToken: "access-1" });
    server.use(
      http.post(`${api}/auth/logout`, () => HttpResponse.error()),
    );

    await expect(authApi.logout()).rejects.toThrow();
    expect(authTokenStore.getAccessToken()).toBeNull();
  });
});
