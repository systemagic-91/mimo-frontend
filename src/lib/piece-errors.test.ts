import { describe, expect, it } from "vitest";
import { parseCostToCents } from "./piece-errors";

describe("parseCostToCents", () => {
  it("treats empty as not informed and zero as a valid cost", () => {
    expect(parseCostToCents("")).toBeNull();
    expect(parseCostToCents("   ")).toBeNull();
    expect(parseCostToCents("0")).toBe(0);
    expect(parseCostToCents("0,00")).toBe(0);
  });

  it("converts reais with comma or dot to cents", () => {
    expect(parseCostToCents("12,5")).toBe(1250);
    expect(parseCostToCents("12.34")).toBe(1234);
    expect(parseCostToCents("1 000,10")).toBe(100010);
  });

  it("rejects negative, too many decimals or text", () => {
    expect(parseCostToCents("-1")).toBeUndefined();
    expect(parseCostToCents("1,234")).toBeUndefined();
    expect(parseCostToCents("abc")).toBeUndefined();
  });
});
