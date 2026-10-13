import { NEAR_KM, type Ranked, type Scored } from "./recommend";
import type { Answers, Cuisine, Shop } from "./types";

export const CUISINE_LABEL: Record<Cuisine, string> = {
  doener: "Döner",
  asian: "Asiatisch",
  burger: "Burger",
  indian: "Indisch",
  any: "Egal",
};

const DISH: Record<Shop["cuisine"], string> = {
  doener: "Döner",
  asian: "Bowl",
  burger: "Burger",
  indian: "Curry",
  other: "Hauptgericht",
};

const SAUCE: Record<NonNullable<Answers["sauce"]>, string> = {
  garlic: "Knoblauchsoße",
  herb: "Kräutersoße",
  hot: "scharf",
  all: "mit alles",
};

const MOOD: Record<Answers["mood"], string> = {
  quick: "auf die Hand",
  sit: "zum Hieressen",
  surprise: "+ was der Chef sagt",
};

function item(answers: Answers, shop: Shop): string {
  if (shop.cuisine === "doener") {
    return { salad: "Beilagensalat", normal: "Döner", extra: "Döner, extra Fleisch", xxl: "Dürüm XXL" }[answers.hunger];
  }
  const dish = DISH[shop.cuisine];
  return { salad: "Beilagensalat", normal: dish, extra: `${dish}, große Portion`, xxl: `${dish} XXL` }[answers.hunger];
}

/** Bestellzeilen für den Ergebnis-Bon. Erste Zeile ist das Gericht. */
export function orderLines(answers: Answers, shop: Shop): string[] {
  const filling =
    answers.meat === "calf" ? "Kalb"
    : answers.meat === "chicken" ? "Hähnchen"
    : answers.meat === "veggie" ? (shop.veggie || "Veggie")
    : "Fleisch nach Wahl des Hauses";
  const sauce = shop.cuisine === "doener" && answers.sauce ? [SAUCE[answers.sauce]] : [];
  return [item(answers, shop), filling, ...sauce, MOOD[answers.mood]];
}

export function fmtKm(d: number): string {
  return d < 1 ? `${Math.round(d * 100) * 10} m` : `${d.toFixed(1).replace(".", ",")} km`;
}

const fmtStars = (r: number) => r.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Ein Satz, warum. */
export function reasonLine(answers: Answers, r: Pick<Ranked, "shop" | "reasons" | "distanceKm">): string {
  const top = r.reasons[0]?.key;
  switch (top) {
    case "veggie": return `Weil du Veggie gesagt hast und die hier ${r.shop.veggie} können.`;
    case "portion": return `Weil du „${answers.hunger === "xxl" ? "XXL" : "extra Fleisch"}“ gesagt hast und die hier nicht geizen.`;
    case "near": return `Weil du nicht weit willst und das hier ${fmtKm(r.distanceKm ?? 0)} sind.`;
    case "seating": return "Weil du sitzen willst und hier Platz ist.";
    case "spicy": return "Weil du scharf gesagt hast. Die hier auch.";
    case "meat": return `Weil du ${answers.meat === "calf" ? "Kalb" : "Hähnchen"} willst und die das richtig machen.`;
    case "radar": return "Weil der im Döner Radar weit vorne liegt.";
    case "rating": return `Weil ${r.shop.ratingCount ?? "viele"} Leute bei Google ${fmtStars(r.shop.googleRating ?? 0)} Sterne geben.`;
    case "open": return "Weil die jetzt offen haben. Klingt banal, ist es nicht.";
    case "cuisine": return `Weil du ${CUISINE_LABEL[answers.cuisine]} wolltest. Bitte.`;
    case "surprise": return "Weil du überrascht werden wolltest. Bitte.";
    default: return "Weil hier am wenigsten gegen dich spricht.";
  }
}

/** Worauf eine Person beim Kompromiss verzichtet. Leer = auf nichts. */
export function sacrifices(answers: Answers, shop: Shop, s: Scored): string[] {
  const out: string[] = [];
  if (answers.cuisine !== "any" && shop.cuisine !== answers.cuisine) out.push(CUISINE_LABEL[answers.cuisine]);
  if (answers.meat === "veggie" && !shop.veggie) out.push("Veggie-Garantie");
  if ((answers.hunger === "xxl" || answers.hunger === "extra") && shop.bigPortions === false) out.push("XXL");
  if (answers.mood === "sit" && shop.seating === false) out.push("Sitzplatz");
  if (answers.distance === "near" && s.distanceKm !== null && s.distanceKm > NEAR_KM) out.push("kurzen Weg");
  return out;
}
