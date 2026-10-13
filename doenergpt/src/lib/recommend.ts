import { distanceKm } from "./geo";
import type { Answers, LatLng, Shop } from "./types";

export type ReasonKey =
  | "veggie" | "portion" | "near" | "seating" | "spicy" | "meat" | "rating" | "radar" | "open" | "cuisine" | "surprise";

export type Reason = { key: ReasonKey; weight: number };

export type Scored = {
  score: number;
  /** Gründe, stärkster zuerst. */
  reasons: Reason[];
  distanceKm: number | null;
  /** Ein Ausschlusskriterium greift (zu, falsche Küche, kein Veggie, zu weit weg). */
  conflict: boolean;
};

export type Ranked = Scored & { shop: Shop };

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
/** Google-Sterne werden Richtung 4,0 gezogen, bis genug Bewertungen da sind. */
const PRIOR_MEAN = 4;
const PRIOR_COUNT = 30;

/** Wertung 0–5, eigene Radar-Wertung schlägt Google. */
export function baseRating(shop: Shop): number {
  if (shop.radarRating !== null) return shop.radarRating;
  if (shop.googleRating !== null) {
    const n = shop.ratingCount ?? 0;
    return (shop.googleRating * n + PRIOR_MEAN * PRIOR_COUNT) / (n + PRIOR_COUNT);
  }
  return UNRATED;
}

type ScoreOpts = {
  position: LatLng | null;
  /** Wert aus [0,1) für „überrascht werden“. */
  luck: number;
  /** Im Duell darf die Küche des anderen gewinnen: Abweichung kostet nur Punkte. */
  softCuisine?: boolean;
};

export function scoreShop(answers: Answers, shop: Shop, o: ScoreOpts): Scored {
  const reasons: Reason[] = [];
  const add = (key: ReasonKey, weight: number) => { if (weight > 0) reasons.push({ key, weight }); };
  let conflict = false;

  const rating = baseRating(shop);
  let score = rating * 2;
  if (shop.radarRating !== null) { score += 2; add("radar", 1 + shop.radarRating - 3); }
  else if (rating >= 4.4) add("rating", rating - 3.5);

  if (answers.cuisine !== "any") {
    if (shop.cuisine === answers.cuisine) { score += 3; add("cuisine", 0.5); }
    else if (o.softCuisine) score -= 4;
    else { score -= 20; conflict = true; }
  }

  if (shop.openNow === false) { score -= 20; conflict = true; }
  else if (shop.openNow === true) { score += 1; add("open", 0.4); }

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
  const d = o.position ? distanceKm(o.position, shop) : null;
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
    const w = o.luck * 4;
    score += w;
    add("surprise", w);
  }

  reasons.sort((a, b) => b.weight - a.weight);
  return { score, reasons, distanceKm: d, conflict };
}

const byScore = (a: Ranked, b: Ranked) => b.score - a.score || a.shop.id.localeCompare(b.shop.id);

/** Passende zuerst, dann der Rest. Passt nichts: bestbewerteter Laden zuerst (Pizza-Fallback). */
function finish(ranked: Ranked[]): Recommendation {
  const fits = ranked.filter((r) => !r.conflict).sort(byScore);
  if (fits.length > 0) {
    return { ranked: [...fits, ...ranked.filter((r) => r.conflict).sort(byScore)], fallback: false };
  }
  const byRating = (a: Ranked, b: Ranked) => baseRating(b.shop) - baseRating(a.shop) || byScore(a, b);
  return { ranked: [...ranked].sort(byRating), fallback: true };
}

export function recommend(answers: Answers, shops: Shop[], opts: Options = {}): Recommendation {
  const random = opts.random ?? Math.random;
  const position = opts.position ?? null;
  return finish(shops.map((shop) => ({
    shop,
    ...scoreShop(answers, shop, { position, luck: answers.mood === "surprise" ? random() : 0 }),
  })));
}

export type DuoRanked = Ranked & { a: Scored; b: Scored };
export type DuoRecommendation = { ranked: DuoRanked[]; fallback: boolean };

/**
 * Kompromiss für zwei. Beide Scores zählen, ein großer Abstand kostet:
 * lieber ein Laden, mit dem beide gut leben, als einer, den nur eine Person liebt.
 */
export function recommendDuo(a: Answers, b: Answers, shops: Shop[], opts: Options = {}): DuoRecommendation {
  const random = opts.random ?? Math.random;
  const position = opts.position ?? null;
  const surprise = a.mood === "surprise" || b.mood === "surprise";
  const ranked = shops.map((shop) => {
    const luck = surprise ? random() : 0;
    const sa = scoreShop(a, shop, { position, luck: a.mood === "surprise" ? luck : 0, softCuisine: true });
    const sb = scoreShop(b, shop, { position, luck: b.mood === "surprise" ? luck : 0, softCuisine: true });
    // Küche: mindestens eine Person muss bekommen, was sie wollte.
    const cuisineOk = [a, b].some((x) => x.cuisine === "any" || x.cuisine === shop.cuisine);
    const reasons = [...sa.reasons, ...sb.reasons].sort((x, y) => y.weight - x.weight);
    return {
      shop,
      a: sa,
      b: sb,
      score: sa.score + sb.score - 0.5 * Math.abs(sa.score - sb.score),
      reasons,
      distanceKm: sa.distanceKm,
      conflict: sa.conflict || sb.conflict || !cuisineOk,
    };
  });
  return finish(ranked) as DuoRecommendation;
}
