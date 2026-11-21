import { defineConfig, devices } from "@playwright/test";
import { API_URL, FRONT_PORT, FRONT_URL } from "./e2e/support/env";

/**
 * E2E contra um backend de teste de verdade (PostgreSQL descartável + .jar do mimo-backend), passando pelo
 * proxy do Vite como em produção (/api → backend). Detalhes no README, seção "Testes E2E".
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/global-setup.ts",
  // Um banco só para todos os testes: em série, para não brigarem pelos mesmos dados nem pelo rate limit.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: FRONT_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Build de produção servido pelo `vite preview`, que usa o mesmo proxy /api do `server.proxy`: é o que
  // vai para a Vercel, sem os plugins de desenvolvimento.
  webServer: {
    command: `npm run build:prod && npx vite preview --port ${FRONT_PORT} --strictPort`,
    url: FRONT_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { API_PROXY_TARGET: API_URL },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
