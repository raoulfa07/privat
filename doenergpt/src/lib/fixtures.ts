// Nur für Tests.
import type { Answers, Shop } from "./types";

export const shop = (id: string, over: Partial<Shop> = {}): Shop => ({
  id, name: id, cuisine: "doener", district: "x", address: "x", lat: 51.96, lng: 7.62,
  radarRating: null, googleRating: null, ratingCount: null, openNow: null, reviewUrl: null, mapsUrl: null,
  veggie: null, chicken: null, calf: null, bigPortions: null, spicy: null, seating: null, ...over,
});

export const answers = (over: Partial<Answers> = {}): Answers => ({
  hunger: "normal", cuisine: "doener", meat: "any", sauce: "garlic", distance: "city", mood: "quick", ...over,
});
