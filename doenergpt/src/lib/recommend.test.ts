import { describe, expect, it } from "vitest";
import { recommend } from "./recommend";
import type { Answers, Shop } from "./types";

const shop = (id: string, over: Partial<Shop> = {}): Shop => ({
  id, name: id, district: "x", address: "x", lat: 51.96, lng: 7.62,
  radarRating: null, reviewUrl: null, veggie: null, chicken: null, calf: null,
  bigPortions: null, spicy: null, seating: null, ...over,
});

const base: Answers = { hunger: "normal", meat: "any", sauce: "garlic", distance: "city", mood: "quick" };
const ids = (r: ReturnType<typeof recommend>) => r.ranked.map((x) => x.shop.id);

describe("recommend", () => {
  it("gibt bei gleichen Antworten den gleichen Vorschlag", () => {
    const shops = [shop("b"), shop("a", { radarRating: 4 }), shop("c", { seating: true })];
    const random = () => { throw new Error("darf ohne Überraschung nicht würfeln"); };
    expect(ids(recommend(base, shops, { random }))).toEqual(ids(recommend(base, [...shops].reverse(), { random })));
  });

  it("nimmt die Bewertung als Basis", () => {
    const r = recommend(base, [shop("a", { radarRating: 3 }), shop("b", { radarRating: 4.5 })]);
    expect(r.ranked[0].shop.id).toBe("b");
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
    const r = recommend({ ...base, mood: "sit" }, [shop("a", { seating: false }), shop("b", { seating: true })]);
    expect(ids(r)).toEqual(["b", "a"]);
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
