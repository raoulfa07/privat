import { useEffect, useRef } from "react";
import Head from "./Head";
import ProgressBar from "./ProgressBar";
import { QUESTIONS } from "../data/questions";
import type { Answers } from "../lib/types";

export type GeoState = "idle" | "asking" | "ok" | "denied" | "unsupported";

type Props = {
  answers: Partial<Answers>;
  step: number;
  onAnswer: (key: keyof Answers, value: string) => void;
  geo: GeoState;
  onLocate: () => void;
};

const GEO_TEXT: Record<GeoState, string> = {
  idle: "",
  asking: "Standort wird gesucht…",
  ok: "Standort da. Wird nicht gespeichert.",
  denied: "Kein Standort. Dann zählt die Frage nur fürs Gefühl.",
  unsupported: "Dein Browser kann keinen Standort. Egal.",
};

export default function Questions({ answers, step, onAnswer, geo, onLocate }: Props) {
  const q = QUESTIONS[step];
  const qRef = useRef<HTMLParagraphElement>(null);

  // Fokus auf die neue Frage, damit Tastatur und Screenreader mitkommen.
  useEffect(() => {
    if (step > 0) qRef.current?.focus();
  }, [step]);

  return (
    <>
      <Head sub="Bestellung läuft" />
      <hr />
      <dl>
        <dt>Status</dt>
        <dd>
          {step} von {QUESTIONS.length} beantwortet
          <ProgressBar value={(step / QUESTIONS.length) * 100} label="Fortschritt" />
        </dd>
      </dl>
      {step > 0 && (
        <>
          <hr />
          <ul aria-label="Bisherige Antworten">
            {QUESTIONS.slice(0, step).map((done) => {
              const value = answers[done.key];
              const label = done.options.find((o) => o.value === value)?.label;
              return (
                <li key={done.key}>
                  <span>1x {label}</span>
                  <span>✓</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <hr />
      <section className="printed" key={q.key} aria-labelledby={`q-${q.key}`}>
        <p className="q" id={`q-${q.key}`} ref={qRef} tabIndex={-1}>
          <b>Frage {step + 1} von {QUESTIONS.length}:</b> {q.text}
        </p>
        {q.key === "distance" && geo !== "ok" && geo !== "unsupported" && (
          <button type="button" className="btn btn-ghost" onClick={onLocate} disabled={geo === "asking"}>
            Meinen Standort nutzen
          </button>
        )}
        {q.key === "distance" && (
          <p className="geo" aria-live="polite">{GEO_TEXT[geo]}</p>
        )}
        <div className="options">
          {q.options.map((o) => (
            <button key={o.value} type="button" className="opt" onClick={() => onAnswer(q.key, o.value)}>
              <span className="box" aria-hidden="true" />
              {o.label}
            </button>
          ))}
        </div>
      </section>
      <p className="foot">Danke für Ihren Einkauf ♥</p>
    </>
  );
}
