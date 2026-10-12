import type { Ranked } from "./recommend";
import type { Answers } from "./types";

const ITEM: Record<Answers["hunger"], string> = {
  salad: "Beilagensalat",
  normal: "Döner",
  extra: "Döner, extra Fleisch",
  xxl: "Dürüm XXL",
};

const SAUCE: Record<Answers["sauce"], string> = {
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

/** Bestellzeilen für den Ergebnis-Bon. */
export function orderLines(answers: Answers, r: Ranked): string[] {
  const filling =
    answers.meat === "calf" ? "Kalb"
    : answers.meat === "chicken" ? "Hähnchen"
    : answers.meat === "veggie" ? (r.shop.veggie || "Veggie")
    : "Fleisch nach Wahl des Hauses";
  return [ITEM[answers.hunger], filling, SAUCE[answers.sauce], MOOD[answers.mood]];
}

export function fmtKm(d: number): string {
  return d < 1 ? `${Math.round(d * 100) * 10} m` : `${d.toFixed(1).replace(".", ",")} km`;
}

/** Ein Satz, warum. */
export function reasonLine(answers: Answers, r: Ranked): string {
  const top = r.reasons[0]?.key;
  switch (top) {
    case "veggie": return `Weil du Veggie gesagt hast und die hier ${r.shop.veggie} können.`;
    case "portion": return `Weil du „${answers.hunger === "xxl" ? "Dürüm XXL" : "extra Fleisch"}“ gesagt hast und die hier nicht geizen.`;
    case "near": return `Weil du nicht weit willst und das hier ${fmtKm(r.distanceKm ?? 0)} sind.`;
    case "seating": return "Weil du sitzen willst und hier Platz ist.";
    case "spicy": return "Weil du scharf gesagt hast. Die hier auch.";
    case "meat": return `Weil du ${answers.meat === "calf" ? "Kalb" : "Hähnchen"} willst und die das richtig machen.`;
    case "rating": return "Weil der im Döner Radar weit vorne liegt.";
    case "surprise": return "Weil du überrascht werden wolltest. Bitte.";
    default: return "Weil hier am wenigsten gegen dich spricht.";
  }
}
