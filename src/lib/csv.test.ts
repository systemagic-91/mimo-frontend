import { describe, expect, it } from "vitest";
import { buildCsv, centsToCsvDecimal } from "./csv";

describe("csv", () => {
  it("starts with the BOM and uses ; and CRLF", () => {
    expect(buildCsv(["A", "B"], [["x", 1]])).toBe("﻿A;B\r\nx;1");
  });

  it("quotes separators, quotes and line breaks", () => {
    const csv = buildCsv(["Nome"], [["Ana; Bia"], ['Diz "oi"'], ["linha\nnova"], ["a,b"]]);
    expect(csv.split("\r\n").slice(1)).toEqual(['"Ana; Bia"', '"Diz ""oi"""', '"linha\nnova"', '"a,b"']);
  });

  it("neutralizes text that Excel would run as a formula", () => {
    const csv = buildCsv(["Nome"], [["=HYPERLINK(1)"], ["+1"], ["-2"], ["@SUM(A1)"]]);
    expect(csv.split("\r\n").slice(1)).toEqual(["'=HYPERLINK(1)", "'+1", "'-2", "'@SUM(A1)"]);
  });

  it("keeps numbers and empty cells as they are", () => {
    expect(buildCsv(["N", "V"], [[-5, null]]).split("\r\n")[1]).toBe("-5;");
  });

  it("formats cents with a decimal comma", () => {
    expect(centsToCsvDecimal(123456)).toBe("1234,56");
    expect(centsToCsvDecimal(5)).toBe("0,05");
  });
});
