import { describe, expect, it } from "vitest";
import { classifyRank } from "@/lib/predictor";

describe("classifyRank", () => {
  it("classifies safe ranks", () => {
    expect(classifyRank(900, 1000)).toBe("Safe");
  });

  it("classifies moderate ranks", () => {
    expect(classifyRank(1000, 1000)).toBe("Moderate");
  });

  it("classifies reach ranks", () => {
    expect(classifyRank(1100, 1000)).toBe("Reach");
  });

  it("ignores ranks outside the nearby window", () => {
    expect(classifyRank(1300, 1000)).toBeNull();
  });
});
