import { describe, expect, it } from "vitest";
import { formatCents, formatDate, formatDateTime, formatLocalDate, formatLongDate } from "./format";

const SP = "America/Sao_Paulo";

describe("format", () => {
  it("formats cents as Brazilian money", () => {
    expect(formatCents(123456)).toMatch(/^R\$\s1\.234,56$/);
    expect(formatCents(-2500)).toMatch(/^-R\$\s25,00$/);
  });

  it("formats dates in pt-BR in the store timezone, not the browser one", () => {
    expect(formatLocalDate("2026-11-30")).toBe("30/11/2026");
    // 02:59 UTC de 1º/12 ainda é 30/11 em São Paulo.
    expect(formatDate("2026-12-01T02:59:59.999Z", SP)).toBe("30/11/2026");
    expect(formatDate("2026-12-01T02:59:59.999Z", "UTC")).toBe("01/12/2026");
    expect(formatDateTime("2026-12-01T02:59:00Z", SP)).toBe("30/11/2026 23:59");
  });

  it("formats the long date with a capital first letter", () => {
    expect(formatLongDate("2026-11-21T15:00:00Z", SP)).toBe("Sábado, 21 de novembro");
  });
});
