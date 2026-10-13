/** null = wissen wir (noch) nicht. Unbekanntes zählt im Scoring nicht. */
export type Shop = {
  id: string;
  name: string;
  cuisine: ShopCuisine;
  district: string;
  address: string;
  lat: number;
  lng: number;
  /** Döner-Radar-Wertung 0–5. null = nicht von uns getestet. */
  radarRating: number | null;
  /** Google-Sterne 1–5 und Anzahl Bewertungen. */
  googleRating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  /** Link zum Review bzw. Instagram-Post. */
  reviewUrl: string | null;
  mapsUrl: string | null;
  /** Was es ohne Fleisch gibt ("Halloumi", "Falafel", "vegetarisch"), false = nichts. */
  veggie: string | false | null;
  chicken: boolean | null;
  calf: boolean | null;
  bigPortions: boolean | null;
  spicy: boolean | null;
  seating: boolean | null;
};

export type Cuisine = "doener" | "asian" | "burger" | "indian" | "any";
/** "other" = Restaurant ohne passende Kategorie (nur bei „Egal“). */
export type ShopCuisine = Exclude<Cuisine, "any"> | "other";

export type Answers = {
  hunger: "salad" | "normal" | "extra" | "xxl";
  cuisine: Cuisine;
  meat: "calf" | "chicken" | "veggie" | "any";
  /** Nur bei Döner gefragt. */
  sauce: "garlic" | "herb" | "hot" | "all" | null;
  distance: "near" | "city" | "greven";
  mood: "quick" | "sit" | "surprise";
};

export type LatLng = { lat: number; lng: number };

/** Woher die Läden kommen. "demo" = lokale Seed-Daten (nur Döner in Münster). */
export type ShopSource = "google" | "demo";
