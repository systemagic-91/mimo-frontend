import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { afterAll, afterEach, beforeAll } from "vitest";
import { authTokenStore } from "@/lib/api/http";
import { server } from "./server";

// No jsdom, `AbortSignal` é o do jsdom, e o `Request` do Node (usado pelo MSW) o rejeita como "não é um
// AbortSignal". Nos testes de componente, o fetch passa sem o signal e o cancelamento é repassado à mão.
function installJsdomFetchShim() {
  if (typeof window === "undefined") return;
  const interceptedFetch = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const { signal, ...rest } = init;
    const request = interceptedFetch(input, rest);
    if (!signal) return request;
    const aborted = () =>
      new DOMException(String(signal.reason ?? "Aborted"), "AbortError");
    if (signal.aborted) return Promise.reject(aborted());
    return new Promise<Response>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(aborted()), { once: true });
      request.then(resolve, reject);
    });
  };
}

// APIs de layout que o jsdom não implementa: o Select do Radix as usa ao abrir, e o Checkbox e o Switch
// medem o próprio tamanho com `ResizeObserver`.
function installJsdomLayoutPolyfills() {
  if (typeof window === "undefined") return;
  const proto = window.HTMLElement.prototype;
  proto.hasPointerCapture ??= () => false;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  installJsdomFetchShim();
  installJsdomLayoutPolyfills();
});
afterEach(() => {
  if (typeof document !== "undefined") cleanup();
  // O estado dos toasts é global: sem isso, o próximo <Toaster /> mostraria os toasts deste teste.
  toast.dismiss();
  server.resetHandlers();
  authTokenStore.clear();
  authTokenStore.setUnauthorizedHandler(undefined);
  authTokenStore.setPasswordChangeRequiredHandler(undefined);
});
afterAll(() => server.close());
