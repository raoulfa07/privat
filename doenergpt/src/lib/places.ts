import seed from "../data/shops.json";
import type { Cuisine, LatLng, Shop, ShopCuisine, ShopSource } from "./types";

/** Suchbegriff je Küche für Google Places. */
export const SEARCH_TERM: Record<Cuisine, string> = {
  doener: "Döner",
  asian: "asiatisches Restaurant",
  burger: "Burger",
  indian: "indisches Restaurant",
  any: "Restaurant",
};

export const DEFAULT_CITY = "Münster";

export const RADIUS_M = { near: 2000, city: 8000, greven: 25000 } as const;

export type PlacesQuery = {
  cuisines: Cuisine[];
  position: LatLng | null;
  city: string | null;
  radius: number;
};

export type PlacesResult = { source: ShopSource; shops: Shop[]; note?: string };

export const DEMO_SHOPS = seed as Shop[];

export function textQuery(cuisine: Cuisine, q: Pick<PlacesQuery, "position" | "city">): string {
  const term = SEARCH_TERM[cuisine];
  if (q.city) return `${term} in ${q.city}`;
  if (q.position) return term;
  return `${term} in ${DEFAULT_CITY}`;
}

/** Das Stück der Places-API-Antwort, das wir lesen. */
export type GooglePlace = {
  id: string;
  displayName?: { text: string };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  servesVegetarianFood?: boolean;
  dineIn?: boolean;
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
  addressComponents?: { longText: string; types: string[] }[];
};

export const FIELD_MASK = [
  "id", "displayName", "shortFormattedAddress", "formattedAddress", "location", "rating", "userRatingCount",
  "currentOpeningHours.openNow", "servesVegetarianFood", "dineIn", "googleMapsUri", "primaryType", "types",
  "addressComponents",
].map((f) => `places.${f}`).join(",");

const TYPE_CUISINE: [RegExp, ShopCuisine][] = [
  [/kebab|turkish|middle_eastern/, "doener"],
  [/asian|chinese|japanese|thai|vietnamese|korean|sushi|ramen|indonesian/, "asian"],
  [/hamburger/, "burger"],
  [/indian/, "indian"],
];

export function guessCuisine(types: string[]): ShopCuisine {
  const all = types.join(" ");
  return TYPE_CUISINE.find(([re]) => re.test(all))?.[1] ?? "other";
}

function district(p: GooglePlace): string {
  const c = p.addressComponents ?? [];
  const pick = (t: string) => c.find((x) => x.types.includes(t))?.longText;
  return pick("sublocality_level_1") ?? pick("sublocality") ?? pick("locality") ?? "";
}

/** Google Place → Shop. queried = die gesuchte Küche, falls eindeutig. */
export function fromGoogle(p: GooglePlace, queried: Cuisine): Shop | null {
  if (!p.location || !p.displayName) return null;
  return {
    id: `g:${p.id}`,
    name: p.displayName.text,
    cuisine: queried !== "any" ? queried : guessCuisine([p.primaryType ?? "", ...(p.types ?? [])]),
    district: district(p),
    address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
    lat: p.location.latitude,
    lng: p.location.longitude,
    radarRating: null,
    googleRating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? null,
    openNow: p.currentOpeningHours?.openNow ?? null,
    reviewUrl: null,
    mapsUrl: p.googleMapsUri ?? null,
    // Google sagt „true“ verlässlich, „fehlt“ heißt nur: unbekannt.
    veggie: p.servesVegetarianFood ? "vegetarisch" : null,
    chicken: null,
    calf: null,
    bigPortions: null,
    spicy: null,
    seating: p.dineIn ?? null,
  };
}

/** Eigene Döner-Radar-Daten über Google-Treffer legen (gleicher Name, < 150 m). */
export function mergeRadar(shops: Shop[], radar: Shop[]): Shop[] {
  return shops.map((s) => {
    const own = radar.find((r) => r.name.toLowerCase() === s.name.toLowerCase() &&
      Math.abs(r.lat - s.lat) < 0.0014 && Math.abs(r.lng - s.lng) < 0.0022);
    if (!own) return s;
    const keep = Object.fromEntries(Object.entries(own).filter(([k, v]) => v !== null && k !== "id" && k !== "lat" && k !== "lng"));
    return { ...s, ...keep };
  });
}

export function toParams(q: PlacesQuery): URLSearchParams {
  const p = new URLSearchParams({ cuisine: q.cuisines.join(","), radius: String(q.radius) });
  if (q.position) { p.set("lat", q.position.lat.toFixed(5)); p.set("lng", q.position.lng.toFixed(5)); }
  if (q.city) p.set("city", q.city);
  return p;
}

const DEMO_NOTE = "Demo-Daten: nur Döner in Münster.";

/** Läden holen. Klappt die Live-Suche nicht, gibt es die Demo-Läden. */
export async function fetchShops(q: PlacesQuery, timeoutMs = 8000): Promise<PlacesResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/places?${toParams(q)}`, { signal: ctrl.signal });
    if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) throw new Error(String(res.status));
    const data = (await res.json()) as PlacesResult;
    if (data.source === "google" && data.shops.length === 0) {
      return { source: "google", shops: [], note: "Hier gibt es nichts Passendes. Zumindest nichts, das Google kennt." };
    }
    return data;
  } catch {
    return { source: "demo", shops: DEMO_SHOPS, note: DEMO_NOTE };
  } finally {
    clearTimeout(t);
  }
}
