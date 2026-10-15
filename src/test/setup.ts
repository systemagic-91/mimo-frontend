import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  if (typeof document !== "undefined") cleanup();
  server.resetHandlers();
  authTokenStore.clear();
  authTokenStore.setUnauthorizedHandler(undefined);
});
afterAll(() => server.close());
