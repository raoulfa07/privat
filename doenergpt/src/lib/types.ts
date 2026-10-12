/** null = wissen wir (noch) nicht. Unbekanntes zählt im Scoring nicht. */
export type Shop = {
  id: string;
  name: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  /** Döner-Radar-Wertung 0–5. null = noch nicht getestet. */
  radarRating: number | null;
  /** Link zum Review bzw. Instagram-Post. */
  reviewUrl: string | null;
  /** Was es ohne Fleisch gibt ("Halloumi", "Falafel"), false = nichts. */
  veggie: string | false | null;
  chicken: boolean | null;
  calf: boolean | null;
  bigPortions: boolean | null;
  spicy: boolean | null;
  seating: boolean | null;
};

export type Answers = {
  hunger: "salad" | "normal" | "extra" | "xxl";
  meat: "calf" | "chicken" | "veggie" | "any";
  sauce: "garlic" | "herb" | "hot" | "all";
  distance: "near" | "city" | "greven";
  mood: "quick" | "sit" | "surprise";
};

export type LatLng = { lat: number; lng: number };
