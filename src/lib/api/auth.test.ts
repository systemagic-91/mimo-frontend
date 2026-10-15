// @vitest-environment node

import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
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
  refreshToken: "refresh-1",
};

describe("authentication API", () => {
  it("logs in and installs the returned tokens", async () => {
    server.use(
      http.post(`${api}/auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "user@example.com",
          password: "correct-password",
        });
        return HttpResponse.json(authResponse);
      }),
    );

    await expect(
      authApi.login("user@example.com", "correct-password"),
    ).resolves.toEqual(authResponse);
    expect(authTokenStore.getAccessToken()).toBe("access-1");
    expect(authTokenStore.getRefreshToken()).toBe("refresh-1");
  });

  it("uses the refresh token to restore the current user", async () => {
    authTokenStore.set(authResponse);
    server.use(
      http.post(`${api}/auth/refresh`, async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: "refresh-1" });
        return HttpResponse.json({
          ...authResponse,
          accessToken: "access-2",
          refreshToken: "refresh-2",
        });
      }),
      http.get(`${api}/auth/me`, ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer access-2");
        return HttpResponse.json({
          user: authResponse.user,
          session: authResponse.session,
        });
      }),
    );

    await authApi.refresh();
    await expect(authApi.me()).resolves.toEqual({
      user: authResponse.user,
      session: authResponse.session,
    });
    expect(authTokenStore.getRefreshToken()).toBe("refresh-2");
  });

  it("refreshes an expired access token before revoking the session", async () => {
    authTokenStore.set(authResponse);
    let logoutAttempts = 0;
    server.use(
      http.post(`${api}/auth/logout`, async ({ request }) => {
        logoutAttempts += 1;
        const token = request.headers.get("Authorization");
        if (token === "Bearer access-1") {
          return HttpResponse.json(
            { status: 401, code: "UNAUTHENTICATED" },
            { status: 401 },
          );
        }
        expect(token).toBe("Bearer access-2");
        expect(await request.json()).toEqual({ refreshToken: "refresh-2" });
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(`${api}/auth/refresh`, async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: "refresh-1" });
        return HttpResponse.json({
          ...authResponse,
          accessToken: "access-2",
          refreshToken: "refresh-2",
        });
      }),
    );

    await authApi.logout();

    expect(logoutAttempts).toBe(2);
    expect(authTokenStore.getAccessToken()).toBeNull();
    expect(authTokenStore.getRefreshToken()).toBeNull();
  });
});
