import { distanceKm } from "./geo";
import type { Answers, LatLng, Shop } from "./types";

export type ReasonKey = "veggie" | "portion" | "near" | "seating" | "spicy" | "meat" | "rating" | "surprise";

export type Ranked = {
  shop: Shop;
  score: number;
  /** Gründe, stärkster zuerst. */
  reasons: { key: ReasonKey; weight: number }[];
  distanceKm: number | null;
  /** Ein Ausschlusskriterium greift (kein Veggie, zu weit weg). */
  conflict: boolean;
};

export type Recommendation = { ranked: Ranked[]; fallback: boolean };

export type Options = {
  position?: LatLng | null;
  /** Nur für „Ich will überrascht werden“. Default Math.random. */
  random?: () => number;
};

/** Bis hier gilt „um die Ecke“. */
export const NEAR_KM = 1.5;
/** Weiter als das ist „quer durch Münster“ nicht mehr. */
export const CITY_KM = 8;

const UNRATED = 2.5;

export function recommend(answers: Answers, shops: Shop[], opts: Options = {}): Recommendation {
  const random = opts.random ?? Math.random;
  const pos = opts.position ?? null;

  const ranked = shops.map((shop) => {
    const reasons: Ranked["reasons"] = [];
    const add = (key: ReasonKey, weight: number) => weight > 0 && reasons.push({ key, weight });
    let conflict = false;

    const rating = shop.radarRating ?? UNRATED;
    let score = rating * 2;
    if (shop.radarRating !== null && shop.radarRating >= 4) add("rating", shop.radarRating - 3);

    if (answers.meat === "veggie") {
      if (shop.veggie) { score += 4; add("veggie", 4); }
      else if (shop.veggie === false) { score -= 20; conflict = true; }
    } else if (answers.meat === "calf" || answers.meat === "chicken") {
      const has = answers.meat === "calf" ? shop.calf : shop.chicken;
      if (has === true) { score += 1.5; add("meat", 1.5); }
      else if (has === false) score -= 3;
    }

    if (answers.hunger === "extra" || answers.hunger === "xxl") {
      const w = answers.hunger === "xxl" ? 3 : 2;
      if (shop.bigPortions === true) { score += w; add("portion", w); }
      else if (shop.bigPortions === false) score -= w;
    }

    if (answers.sauce === "hot" && shop.spicy === true) { score += 1.5; add("spicy", 1.5); }

    if (answers.mood === "sit") {
      if (shop.seating === true) { score += 2.5; add("seating", 2.5); }
      else if (shop.seating === false) score -= 2.5;
    }

    // Entfernung zählt nur mit Standort. Ohne bleibt die Frage Deko.
    const d = pos ? distanceKm(pos, shop) : null;
    if (d !== null) {
      if (answers.distance === "near") {
        if (d <= NEAR_KM) { const w = 4 + (NEAR_KM - d) * 2; score += w; add("near", w); }
        else { score -= Math.min(8, (d - NEAR_KM) * 2); if (d > NEAR_KM * 2) conflict = true; }
      } else if (answers.distance === "city") {
        score += Math.max(0, 1.5 - d / 4);
        if (d > CITY_KM) { score -= 4; conflict = true; }
      }
      // „Greven“: Entfernung egal.
      if (answers.mood === "quick") score -= Math.min(2, d / 3);
    }

    if (answers.mood === "surprise") {
      const w = random() * 4;
      score += w;
      add("surprise", w);
    }

    reasons.sort((a, b) => b.weight - a.weight);
    return { shop, score, reasons, distanceKm: d, conflict };
  });

  const byScore = (a: Ranked, b: Ranked) => b.score - a.score || a.shop.id.localeCompare(b.shop.id);
  const fits = ranked.filter((r) => !r.conflict).sort(byScore);
  if (fits.length > 0) {
    return { ranked: [...fits, ...ranked.filter((r) => r.conflict).sort(byScore)], fallback: false };
  }

  // Nichts passt: bestbewerteter Laden zuerst.
  const byRating = (a: Ranked, b: Ranked) =>
    (b.shop.radarRating ?? UNRATED) - (a.shop.radarRating ?? UNRATED) || byScore(a, b);
  return { ranked: [...ranked].sort(byRating), fallback: true };
}
