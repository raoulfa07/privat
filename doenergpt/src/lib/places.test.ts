import { describe, expect, it } from "vitest";
import { fromGoogle, guessCuisine, mergeRadar, textQuery } from "./places";
import { shop } from "./fixtures";

describe("textQuery", () => {
  it("sucht in der Stadt, am Standort oder in Münster", () => {
    expect(textQuery("doener", { city: "Hamburg", position: null })).toBe("Döner in Hamburg");
    expect(textQuery("asian", { city: null, position: { lat: 1, lng: 2 } })).toBe("asiatisches Restaurant");
    expect(textQuery("any", { city: null, position: null })).toBe("Restaurant in Münster");
  });
});

describe("fromGoogle", () => {
  const place = {
    id: "abc",
    displayName: { text: "Thai Haus" },
    shortFormattedAddress: "Hafenweg 1",
    location: { latitude: 51.95, longitude: 7.64 },
    rating: 4.6,
    userRatingCount: 300,
    currentOpeningHours: { openNow: true },
    servesVegetarianFood: true,
    dineIn: true,
    googleMapsUri: "https://maps.google.com/?cid=1",
    primaryType: "thai_restaurant",
    addressComponents: [{ longText: "Hafen", types: ["sublocality_level_1", "sublocality"] }],
  };

  it("übernimmt, was Google weiß, und lässt den Rest unbekannt", () => {
    const s = fromGoogle(place, "any")!;
    expect(s).toMatchObject({
      id: "g:abc", name: "Thai Haus", cuisine: "asian", district: "Hafen", googleRating: 4.6, ratingCount: 300,
      openNow: true, veggie: "vegetarisch", seating: true, mapsUrl: "https://maps.google.com/?cid=1",
    });
    expect(s.bigPortions).toBeNull();
    expect(s.radarRating).toBeNull();
  });

  it("nimmt die gesuchte Küche, wenn sie eindeutig ist", () => {
    expect(fromGoogle(place, "doener")!.cuisine).toBe("doener");
  });

  it("wertet fehlendes Veggie als unbekannt, nicht als nein", () => {
    expect(fromGoogle({ ...place, servesVegetarianFood: undefined }, "any")!.veggie).toBeNull();
  });

  it("verwirft Orte ohne Lage", () => {
    expect(fromGoogle({ id: "x", displayName: { text: "x" } }, "any")).toBeNull();
  });
});

describe("guessCuisine", () => {
  it("ordnet Google-Typen zu", () => {
    expect(guessCuisine(["kebab_shop"])).toBe("doener");
    expect(guessCuisine(["hamburger_restaurant", "restaurant"])).toBe("burger");
    expect(guessCuisine(["italian_restaurant"])).toBe("other");
  });
});

describe("mergeRadar", () => {
  it("legt eigene Daten über den passenden Google-Treffer", () => {
    const g = shop("g:1", { name: "Kebab Kumpels", lat: 51.9605, lng: 7.6266, googleRating: 4.5 });
    const own = shop("kebab-kumpels", { name: "Kebab Kumpels", lat: 51.9604, lng: 7.6265, radarRating: 4.8, veggie: "Halloumi" });
    const [m] = mergeRadar([g], [own]);
    expect(m).toMatchObject({ id: "g:1", radarRating: 4.8, veggie: "Halloumi", googleRating: 4.5 });
  });
  it("lässt gleichnamige Läden woanders in Ruhe", () => {
    const g = shop("g:1", { name: "King Döner", lat: 53.55 });
    expect(mergeRadar([g], [shop("k", { name: "King Döner", radarRating: 2 })])[0].radarRating).toBeNull();
  });
});
