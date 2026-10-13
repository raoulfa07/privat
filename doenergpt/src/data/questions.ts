import type { Answers } from "../lib/types";

type Option<K extends keyof Answers> = { value: NonNullable<Answers[K]>; label: string };

type Question<K extends keyof Answers> = {
  key: K;
  text: string;
  options: Option<K>[];
  /** Frage nur stellen, wenn das hier stimmt. */
  when?: (a: Partial<Answers>) => boolean;
};

export type AnyQuestion = { [K in keyof Answers]: Question<K> }[keyof Answers];

export const QUESTIONS: AnyQuestion[] = [
  {
    key: "hunger",
    text: "Wie hungrig bist du, auf einer Skala von Beilagensalat bis Dürüm XXL?",
    options: [
      { value: "salad", label: "Beilagensalat" },
      { value: "normal", label: "Normaler Döner" },
      { value: "extra", label: "Döner mit extra Fleisch" },
      { value: "xxl", label: "Dürüm XXL" },
    ],
  },
  {
    key: "cuisine",
    text: "Muss es Döner sein?",
    options: [
      { value: "doener", label: "Ja. Was sonst." },
      { value: "asian", label: "Asiatisch" },
      { value: "burger", label: "Burger" },
      { value: "indian", label: "Indisch" },
      { value: "any", label: "Egal, Hauptsache lecker" },
    ],
  },
  {
    key: "meat",
    text: "Fleisch oder Gemüse?",
    options: [
      { value: "calf", label: "Kalb" },
      { value: "chicken", label: "Hähnchen" },
      { value: "veggie", label: "Veggie/Halloumi" },
      { value: "any", label: "Egal, Hauptsache warm" },
    ],
  },
  {
    key: "sauce",
    text: "Soße?",
    when: (a) => a.cuisine === "doener",
    options: [
      { value: "garlic", label: "Knoblauch" },
      { value: "herb", label: "Kräuter" },
      { value: "hot", label: "Scharf" },
      { value: "all", label: "Alles. Mit alles." },
    ],
  },
  {
    key: "distance",
    text: "Wie weit willst du dafür gehen?",
    options: [
      { value: "near", label: "Nur um die Ecke" },
      { value: "city", label: "Quer durch die Stadt" },
      { value: "greven", label: "Für das beste Essen auch nach Greven" },
    ],
  },
  {
    key: "mood",
    text: "Wie ist die Stimmung?",
    options: [
      { value: "quick", label: "Schnell auf die Hand" },
      { value: "sit", label: "Hinsetzen und genießen" },
      { value: "surprise", label: "Ich will überrascht werden" },
    ],
  },
];

/** Die Fragen, die bei diesen Antworten gestellt werden. */
export function activeQuestions(a: Partial<Answers>): AnyQuestion[] {
  return QUESTIONS.filter((q) => !q.when || q.when(a));
}

/** Fehlende optionale Antworten auffüllen, sobald alle aktiven Fragen beantwortet sind. */
export function complete(a: Partial<Answers>): Answers {
  return { sauce: null, ...a } as Answers;
}
