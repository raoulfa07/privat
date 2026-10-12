import type { Answers } from "../lib/types";

type Question<K extends keyof Answers> = {
  key: K;
  text: string;
  options: { value: Answers[K]; label: string }[];
};

export const QUESTIONS = [
  {
    key: "hunger",
    text: "Wie hungrig bist du, auf einer Skala von Beilagensalat bis Dürüm XXL?",
    options: [
      { value: "salad", label: "Beilagensalat" },
      { value: "normal", label: "Normaler Döner" },
      { value: "extra", label: "Döner mit extra Fleisch" },
      { value: "xxl", label: "Dürüm XXL" },
    ],
  } satisfies Question<"hunger">,
  {
    key: "meat",
    text: "Fleisch oder Gemüse?",
    options: [
      { value: "calf", label: "Kalb" },
      { value: "chicken", label: "Hähnchen" },
      { value: "veggie", label: "Veggie/Halloumi" },
      { value: "any", label: "Egal, Hauptsache warm" },
    ],
  } satisfies Question<"meat">,
  {
    key: "sauce",
    text: "Soße?",
    options: [
      { value: "garlic", label: "Knoblauch" },
      { value: "herb", label: "Kräuter" },
      { value: "hot", label: "Scharf" },
      { value: "all", label: "Alles. Mit alles." },
    ],
  } satisfies Question<"sauce">,
  {
    key: "distance",
    text: "Wie weit willst du dafür gehen?",
    options: [
      { value: "near", label: "Nur um die Ecke" },
      { value: "city", label: "Quer durch Münster" },
      { value: "greven", label: "Für den besten Döner auch nach Greven" },
    ],
  } satisfies Question<"distance">,
  {
    key: "mood",
    text: "Wie ist die Stimmung?",
    options: [
      { value: "quick", label: "Schnell auf die Hand" },
      { value: "sit", label: "Hinsetzen und genießen" },
      { value: "surprise", label: "Ich will überrascht werden" },
    ],
  } satisfies Question<"mood">,
] as const;
