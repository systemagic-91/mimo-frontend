import { afterEach, describe, expect, it } from "vitest";
import { clearLegacyDemoData, LEGACY_DEMO_DB_KEY } from "./legacy-storage";

describe("clearLegacyDemoData", () => {
  afterEach(() => window.localStorage.clear());

  it("removes only the old demo database", () => {
    window.localStorage.setItem(LEGACY_DEMO_DB_KEY, JSON.stringify({ pieces: [] }));
    window.localStorage.setItem("theme", "dark");

    clearLegacyDemoData();

    expect(window.localStorage.getItem(LEGACY_DEMO_DB_KEY)).toBeNull();
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("does not break when the storage is blocked", () => {
    const blocked = {
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    expect(() => clearLegacyDemoData(blocked)).not.toThrow();
  });
});
