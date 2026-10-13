import { describe, expect, it } from "vitest";
import { baseRating, recommend, recommendDuo } from "./recommend";
import { answers, shop } from "./fixtures";

const base = answers();
const ids = (r: { ranked: { shop: { id: string } }[] }) => r.ranked.map((x) => x.shop.id);
const noDice = () => { throw new Error("darf ohne Überraschung nicht würfeln"); };

describe("recommend", () => {
  it("gibt bei gleichen Antworten den gleichen Vorschlag", () => {
    const shops = [shop("b"), shop("a", { radarRating: 4 }), shop("c", { seating: true })];
    expect(ids(recommend(base, shops, { random: noDice }))).toEqual(ids(recommend(base, [...shops].reverse(), { random: noDice })));
  });

  it("nimmt die Bewertung als Basis", () => {
    expect(recommend(base, [shop("a", { radarRating: 3 }), shop("b", { radarRating: 4.5 })]).ranked[0].shop.id).toBe("b");
  });

  it("sortiert Gleichstand stabil nach id", () => {
    expect(ids(recommend(base, [shop("z"), shop("m"), shop("a")]))).toEqual(["a", "m", "z"]);
  });

  it("bevorzugt bei Veggie Läden mit Veggie-Option und schiebt Läden ohne nach hinten", () => {
    const r = recommend({ ...base, meat: "veggie" }, [
      shop("fleisch", { veggie: false, radarRating: 5 }),
      shop("unbekannt"),
      shop("halloumi", { veggie: "Halloumi" }),
    ]);
    expect(ids(r)).toEqual(["halloumi", "unbekannt", "fleisch"]);
    expect(r.ranked[0].reasons[0].key).toBe("veggie");
    expect(r.fallback).toBe(false);
  });

  it("belohnt große Portionen bei Dürüm XXL", () => {
    const r = recommend({ ...base, hunger: "xxl" }, [shop("a"), shop("b", { bigPortions: true })]);
    expect(r.ranked[0].shop.id).toBe("b");
    expect(r.ranked[0].reasons[0].key).toBe("portion");
  });

  it("bevorzugt Sitzplätze bei „Hinsetzen“", () => {
    expect(ids(recommend({ ...base, mood: "sit" }, [shop("a", { seating: false }), shop("b", { seating: true })]))).toEqual(["b", "a"]);
  });

  it("ignoriert Entfernung ohne Standort", () => {
    const shops = [shop("weit", { lat: 52.1, radarRating: 4 }), shop("nah", { radarRating: 3 })];
    expect(recommend({ ...base, distance: "near" }, shops).ranked[0].shop.id).toBe("weit");
  });

  it("nimmt mit Standort bei „um die Ecke“ den nahen Laden", () => {
    const position = { lat: 51.96, lng: 7.62 };
    const shops = [shop("weit", { lat: 51.99, radarRating: 4 }), shop("nah", { lat: 51.962, radarRating: 3 })];
    const r = recommend({ ...base, distance: "near" }, shops, { position });
    expect(r.ranked[0].shop.id).toBe("nah");
    expect(r.ranked[0].reasons[0].key).toBe("near");
    expect(r.ranked[0].distanceKm).toBeCloseTo(0.22, 1);
  });

  it("schließt falsche Küche und geschlossene Läden aus", () => {
    const r = recommend({ ...base, cuisine: "asian" }, [
      shop("doener", { radarRating: 5 }),
      shop("zu", { cuisine: "asian", openNow: false }),
      shop("thai", { cuisine: "asian" }),
    ]);
    expect(ids(r)[0]).toBe("thai");
    expect(r.ranked.filter((x) => x.conflict).map((x) => x.shop.id).sort()).toEqual(["doener", "zu"]);
  });

  it("nimmt bei „Egal“ jede Küche", () => {
    const r = recommend({ ...base, cuisine: "any" }, [shop("a", { cuisine: "burger" }), shop("b", { cuisine: "other" })]);
    expect(r.ranked.every((x) => !x.conflict)).toBe(true);
  });

  it("zieht Google-Sterne mit wenigen Bewertungen Richtung Mitte", () => {
    const viele = shop("viele", { googleRating: 4.6, ratingCount: 2000 });
    const wenige = shop("wenige", { googleRating: 5, ratingCount: 3 });
    expect(baseRating(viele)).toBeGreaterThan(baseRating(wenige));
    expect(recommend(base, [wenige, viele]).ranked[0].shop.id).toBe("viele");
  });

  it("gibt eigenen Radar-Läden Vorrang vor gleich guten Google-Läden", () => {
    const r = recommend(base, [shop("google", { googleRating: 4.5, ratingCount: 5000 }), shop("radar", { radarRating: 4.5 })]);
    expect(r.ranked[0].shop.id).toBe("radar");
    expect(r.ranked[0].reasons[0].key).toBe("radar");
  });

  it("aktiviert den Fallback, wenn nichts passt, und nimmt dann den bestbewerteten", () => {
    const r = recommend({ ...base, meat: "veggie" }, [
      shop("a", { veggie: false, radarRating: 3 }),
      shop("b", { veggie: false, radarRating: 4.5 }),
    ]);
    expect(r.fallback).toBe(true);
    expect(r.ranked[0].shop.id).toBe("b");
  });

  it("würfelt bei „überrascht werden“", () => {
    const shops = [shop("a"), shop("b")];
    const surprise = { ...base, mood: "surprise" as const };
    const seq = (...v: number[]) => () => v.shift() ?? 0;
    expect(recommend(surprise, shops, { random: seq(0.9, 0.1) }).ranked[0].shop.id).toBe("a");
    expect(recommend(surprise, shops, { random: seq(0.1, 0.9) }).ranked[0].shop.id).toBe("b");
  });

  it("gibt jeden Laden genau einmal zurück", () => {
    const shops = [shop("a", { veggie: false }), shop("b"), shop("c")];
    expect(ids(recommend({ ...base, meat: "veggie" }, shops)).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("recommendDuo", () => {
  it("findet den Laden, mit dem beide leben können", () => {
    const a = answers({ meat: "veggie" });
    const b = answers({ hunger: "xxl" });
    const r = recommendDuo(a, b, [
      shop("nur-xxl", { bigPortions: true, veggie: false }),
      shop("nur-veggie", { veggie: "Falafel", bigPortions: false }),
      shop("beides", { veggie: "Halloumi", bigPortions: true }),
    ], { random: noDice });
    expect(r.ranked[0].shop.id).toBe("beides");
    expect(r.ranked.find((x) => x.shop.id === "nur-xxl")!.conflict).toBe(true);
  });

  it("lässt bei unterschiedlicher Küche beide Küchen zu, aber keine dritte", () => {
    const r = recommendDuo(answers({ cuisine: "doener" }), answers({ cuisine: "asian" }), [
      shop("burger", { cuisine: "burger", radarRating: 5 }),
      shop("thai", { cuisine: "asian" }),
      shop("doener"),
    ]);
    expect(r.ranked.find((x) => x.shop.id === "burger")!.conflict).toBe(true);
    expect(r.ranked.filter((x) => !x.conflict)).toHaveLength(2);
  });

  it("ist symmetrisch", () => {
    const a = answers({ meat: "veggie" });
    const b = answers({ mood: "sit" });
    const shops = [shop("a", { veggie: "Falafel" }), shop("b", { seating: true }), shop("c", { veggie: "x", seating: true })];
    expect(ids(recommendDuo(a, b, shops))).toEqual(ids(recommendDuo(b, a, shops)));
  });

  it("hält beide Einzelwertungen fest", () => {
    const r = recommendDuo(answers({ meat: "veggie" }), answers(), [shop("x", { veggie: "Falafel" })]);
    expect(r.ranked[0].a.reasons[0].key).toBe("veggie");
    expect(r.ranked[0].b.reasons.some((x) => x.key === "veggie")).toBe(false);
  });
});
