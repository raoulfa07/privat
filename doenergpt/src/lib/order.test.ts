import { describe, expect, it } from "vitest";
import { fmtKm, orderLines, reasonLine, sacrifices } from "./order";
import { answers, shop } from "./fixtures";

const halloumi = shop("k", { veggie: "Halloumi", bigPortions: true });
const r = (reasons: { key: "portion" | "near" | "rating"; weight: number }[], distanceKm: number | null = null, s = halloumi) =>
  ({ shop: s, reasons, distanceKm });

describe("orderLines", () => {
  it("baut die Döner-Bestellung aus den Antworten", () => {
    expect(orderLines(answers({ hunger: "xxl", meat: "veggie", sauce: "all" }), halloumi))
      .toEqual(["Dürüm XXL", "Halloumi", "mit alles", "auf die Hand"]);
  });
  it("lässt die Soße weg, wenn es kein Döner ist", () => {
    expect(orderLines(answers({ cuisine: "asian", sauce: null, meat: "chicken", mood: "sit" }), shop("t", { cuisine: "asian" })))
      .toEqual(["Bowl", "Hähnchen", "zum Hieressen"]);
  });
});

describe("reasonLine", () => {
  const a = answers({ hunger: "xxl" });
  it("nennt den stärksten Grund", () => {
    expect(reasonLine(a, r([{ key: "portion", weight: 3 }]))).toBe("Weil du „XXL“ gesagt hast und die hier nicht geizen.");
    expect(reasonLine(a, r([{ key: "near", weight: 5 }], 0.42))).toBe("Weil du nicht weit willst und das hier 420 m sind.");
    expect(reasonLine(a, r([{ key: "rating", weight: 1 }], null, shop("g", { googleRating: 4.7, ratingCount: 812 }))))
      .toBe("Weil 812 Leute bei Google 4,7 Sterne geben.");
  });
  it("hat einen Satz, wenn nichts heraussticht", () => {
    expect(reasonLine(a, r([]))).toMatch(/^Weil/);
  });
});

describe("sacrifices", () => {
  const scored = { score: 0, reasons: [], distanceKm: 3, conflict: false };
  it("listet, worauf jemand verzichtet", () => {
    expect(sacrifices(answers({ cuisine: "asian", distance: "near", meat: "veggie" }), shop("d"), scored))
      .toEqual(["Asiatisch", "Veggie-Garantie", "kurzen Weg"]);
  });
  it("ist leer, wenn alles passt", () => {
    expect(sacrifices(answers(), shop("d"), { ...scored, distanceKm: null })).toEqual([]);
  });
});

describe("fmtKm", () => {
  it("formatiert deutsch", () => {
    expect(fmtKm(2.345)).toBe("2,3 km");
    expect(fmtKm(0.987)).toBe("990 m");
  });
});
