import { describe, expect, it } from "vitest";
import {
  centsToMoney,
  fromBackendConsignmentItemStatus,
  fromBackendConsignmentStatus,
  fromBackendPieceStage,
  fromBackendSellerStatus,
  moneyToCents,
  toBackendPieceStage,
} from "./mappers";

describe("money mappers", () => {
  it.each([
    [0, 0],
    [0.1, 10],
    [0.29, 29],
    [1.005, 101],
    [0.1 + 0.2, 30],
    [-1.25, -125],
  ])("converts %s reais to %s cents", (value, expected) => {
    expect(moneyToCents(value)).toBe(expected);
  });

  it("converts integer cents to the current presentation value", () => {
    expect(centsToMoney(6490)).toBe(64.9);
    expect(centsToMoney(-5)).toBe(-0.05);
  });

  it("rejects non-finite money and unsafe cent values", () => {
    expect(() => moneyToCents(Number.NaN)).toThrow(RangeError);
    expect(() => moneyToCents(Number.MAX_VALUE)).toThrow(RangeError);
    expect(() => centsToMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe("enum mappers", () => {
  it("maps current frontend piece stages to backend enum constants", () => {
    expect(toBackendPieceStage("banho_ouro")).toBe("BANHO_OURO");
    expect(fromBackendPieceStage("BANHO_OURO")).toBe("banho_ouro");
    expect(fromBackendPieceStage("etiquetada")).toBe("etiquetada");
  });

  it("normalizes seller and consignment status values", () => {
    expect(fromBackendSellerStatus("ATIVA")).toBe("ativa");
    expect(fromBackendConsignmentStatus("QUITADA")).toBe("quitada");
    expect(fromBackendConsignmentItemStatus("COM_VENDEDORA")).toBe(
      "com_vendedora",
    );
  });

  it("rejects unknown enum values instead of silently mapping them", () => {
    expect(() => fromBackendPieceStage("ARCHIVED" as never)).toThrow(TypeError);
  });
});
