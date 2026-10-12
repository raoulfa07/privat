import { useEffect, useState } from "react";
import Sign from "./Sign";
import Receipt from "./Receipt";
import Start from "./Start";
import Questions, { type GeoState } from "./Questions";
import Thinking, { THINK_MS } from "./Thinking";
import Result from "./Result";
import { QUESTIONS } from "../data/questions";
import { recommend, type Recommendation } from "../lib/recommend";
import { reducedMotion } from "../lib/motion";
import type { Answers, LatLng, Shop } from "../lib/types";
import shops from "../data/shops.json";

type Phase = "start" | "questions" | "thinking" | "result";

const TAGLINE: Record<Phase, string> = {
  start: "Jetzt geöffnet.",
  questions: "Wir hören zu.",
  thinking: "Moment.",
  result: "Guten Hunger.",
};

export default function Flow() {
  const [phase, setPhase] = useState<Phase>("start");
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [step, setStep] = useState(0);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [position, setPosition] = useState<LatLng | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [index, setIndex] = useState(0);
  const [printKey, setPrintKey] = useState(0);

  function locate() {
    if (!("geolocation" in navigator)) return setGeo("unsupported");
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo("ok"); },
      () => setGeo("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function answer(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step + 1 < QUESTIONS.length) return setStep(step + 1);
    // Einmal rechnen und festhalten, damit „überrascht werden“ nicht bei jedem Render neu würfelt.
    setRec(recommend(next as Answers, shops as Shop[], { position }));
    setIndex(0);
    if (reducedMotion()) return showResult();
    // Denkpause läuft auf dem laufenden Bon, erst das Ergebnis druckt neu.
    setPhase("thinking");
  }

  function showResult() {
    setPhase("result");
    setPrintKey((k) => k + 1);
  }

  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setTimeout(showResult, THINK_MS);
    return () => clearTimeout(t);
  }, [phase]);

  function restart() {
    setAnswers({});
    setStep(0);
    setRec(null);
    setPhase("questions");
    setPrintKey((k) => k + 1);
  }

  function next() {
    setIndex((i) => i + 1);
    setPrintKey((k) => k + 1);
  }

  return (
    <>
      <Sign tagline={TAGLINE[phase]} />
      <Receipt key={printKey} fast={printKey > 0}>
        {phase === "start" && <Start onStart={() => setPhase("questions")} />}
        {phase === "questions" && <Questions answers={answers} step={step} onAnswer={answer} geo={geo} onLocate={locate} />}
        {phase === "thinking" && <Thinking />}
        {phase === "result" && rec && (
          <Result answers={answers as Answers} rec={rec} index={index} onNext={next} onRestart={restart} />
        )}
      </Receipt>
    </>
  );
}
