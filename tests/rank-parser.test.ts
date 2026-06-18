import { describe, expect, it } from "vitest";
import { parseRank } from "@/lib/rank-parser";

describe("parseRank", () => {
  it("preserves raw values and parses numeric ranks", () => {
    expect(parseRank("12,345")).toEqual({ raw: "12,345", numeric: 12345, suffix: null });
  });

  it("extracts suffixes like P", () => {
    expect(parseRank("700P")).toEqual({ raw: "700P", numeric: 700, suffix: "P" });
  });

  it("returns null numeric value for blanks", () => {
    expect(parseRank("-")).toEqual({ raw: "-", numeric: null, suffix: null });
  });
});
