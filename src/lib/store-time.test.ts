import { describe, expect, it } from "vitest";
import {
  addDaysToDate,
  dateInZone,
  endOfDayInZone,
  formatDateInZone,
  formatLocalDate,
  periodRange,
  todayInZone,
} from "./store-time";

const SP = "America/Sao_Paulo";

describe("store time", () => {
  it("uses the store day, not the browser or UTC day", () => {
    // 01:30 UTC de 1º/12 ainda é 30/11 em São Paulo.
    const now = new Date("2026-12-01T01:30:00Z");
    expect(todayInZone(SP, now)).toBe("2026-11-30");
    expect(todayInZone("UTC", now)).toBe("2026-12-01");
    expect(dateInZone("2026-12-01T02:59:59.999Z", SP)).toBe("2026-11-30");
  });

  it("adds days across months and years", () => {
    expect(addDaysToDate("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysToDate("2026-12-31", 30)).toBe("2027-01-30");
    expect(addDaysToDate("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("returns 23:59:59 of the local day as an instant", () => {
    expect(endOfDayInZone("2026-11-30", SP)).toBe("2026-12-01T02:59:59.000Z");
    expect(endOfDayInZone("2026-07-15", "Europe/Lisbon")).toBe("2026-07-15T22:59:59.000Z");
    expect(endOfDayInZone("2026-01-15", "Europe/Lisbon")).toBe("2026-01-15T23:59:59.000Z");
  });

  it("formats dates in pt-BR without shifting the day", () => {
    expect(formatLocalDate("2026-11-30")).toBe("30/11/2026");
    expect(formatDateInZone("2026-12-01T02:59:59.999Z", SP)).toBe("30/11/2026");
  });

  it("builds commission periods in the store timezone", () => {
    const now = new Date("2026-03-01T01:00:00Z"); // ainda 28/02 em São Paulo
    expect(periodRange("mes_atual", SP, now)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("mes_anterior", SP, now)).toEqual({ from: "2026-01-01", to: "2026-01-31" });
    expect(periodRange("historico", SP, now)).toEqual({ from: "2020-01-01", to: "2026-02-28" });
  });
});
