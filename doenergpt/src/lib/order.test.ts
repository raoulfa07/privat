import { describe, expect, it } from "vitest";
import { fmtKm, orderLines, reasonLine } from "./order";
import type { Ranked } from "./recommend";
import type { Shop } from "./types";

const shop: Shop = {
  id: "k", name: "K", district: "x", address: "x", lat: 0, lng: 0, radarRating: null, reviewUrl: null,
  veggie: "Halloumi", chicken: null, calf: null, bigPortions: true, spicy: null, seating: null,
};
const ranked = (reasons: Ranked["reasons"], distanceKm: number | null = null): Ranked =>
  ({ shop, score: 0, reasons, distanceKm, conflict: false });

describe("orderLines", () => {
  it("baut die Bestellung aus den Antworten", () => {
    expect(orderLines({ hunger: "xxl", meat: "veggie", sauce: "all", distance: "city", mood: "quick" }, ranked([])))
      .toEqual(["Dürüm XXL", "Halloumi", "mit alles", "auf die Hand"]);
  });
});

describe("reasonLine", () => {
  const a = { hunger: "xxl", meat: "any", sauce: "all", distance: "near", mood: "quick" } as const;
  it("nennt den stärksten Grund", () => {
    expect(reasonLine(a, ranked([{ key: "portion", weight: 3 }]))).toBe("Weil du „Dürüm XXL“ gesagt hast und die hier nicht geizen.");
    expect(reasonLine(a, ranked([{ key: "near", weight: 5 }], 0.42))).toBe("Weil du nicht weit willst und das hier 420 m sind.");
  });
  it("hat einen Satz, wenn nichts heraussticht", () => {
    expect(reasonLine(a, ranked([]))).toMatch(/^Weil/);
  });
});

describe("fmtKm", () => {
  it("formatiert deutsch", () => {
    expect(fmtKm(2.345)).toBe("2,3 km");
    expect(fmtKm(0.987)).toBe("990 m");
  });
});
