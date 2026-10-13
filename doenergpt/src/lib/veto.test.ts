import { describe, expect, it } from "vitest";
import { isoWeek } from "./veto";

describe("isoWeek", () => {
  it("rechnet ISO-Wochen", () => {
    expect(isoWeek(new Date(2026, 9, 13))).toBe("2026-W42");
    expect(isoWeek(new Date(2027, 0, 1))).toBe("2026-W53");
    expect(isoWeek(new Date(2026, 0, 1))).toBe("2026-W01");
  });
});
