import { useEffect, useRef, useState, type FormEvent } from "react";
import Head from "./Head";
import ProgressBar from "./ProgressBar";
import { activeQuestions } from "../data/questions";
import type { Answers } from "../lib/types";

export type GeoState = "idle" | "asking" | "ok" | "denied" | "unsupported";

type Props = {
  answers: Partial<Answers>;
  /** Im Duell: wer gerade dran ist. */
  player?: string;
  onAnswer: (key: keyof Answers, value: string) => void;
  geo: GeoState;
  onLocate: () => void;
  city: string | null;
  onCity: (city: string | null) => void;
};

const GEO_TEXT: Record<GeoState, string> = {
  idle: "",
  asking: "Standort wird gesucht…",
  ok: "Standort da. Wird nicht gespeichert.",
  denied: "Kein Standort. Dann zählt die Frage nur fürs Gefühl.",
  unsupported: "Dein Browser kann keinen Standort. Egal.",
};

export default function Questions({ answers, player, onAnswer, geo, onLocate, city, onCity }: Props) {
  const qs = activeQuestions(answers);
  const done = qs.filter((q) => answers[q.key] !== undefined);
  const q = qs.find((x) => answers[x.key] === undefined)!;
  const step = done.length;
  const qRef = useRef<HTMLParagraphElement>(null);
  const [cityDraft, setCityDraft] = useState(city ?? "");

  // Fokus auf die neue Frage, damit Tastatur und Screenreader mitkommen.
  useEffect(() => {
    if (step > 0) qRef.current?.focus();
  }, [step]);

  function submitCity(e: FormEvent) {
    e.preventDefault();
    onCity(cityDraft.trim() || null);
  }

  return (
    <>
      <Head sub={player ? `${player} bestellt` : "Bestellung läuft"} />
      <hr />
      <dl>
        <dt>Status</dt>
        <dd>
          {step} von {qs.length} beantwortet
          <ProgressBar value={(step / qs.length) * 100} label="Fortschritt" />
        </dd>
      </dl>
      {step > 0 && (
        <>
          <hr />
          <ul aria-label="Bisherige Antworten">
            {done.map((d) => (
              <li key={d.key}>
                <span>1x {d.options.find((o) => o.value === answers[d.key])?.label}</span>
                <span>✓</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <hr />
      <section className="printed" key={q.key} aria-labelledby={`q-${q.key}`}>
        <p className="q" id={`q-${q.key}`} ref={qRef} tabIndex={-1}>
          <b>Frage {step + 1} von {qs.length}:</b> {q.text}
        </p>
        {q.key === "distance" && (
          <>
            {geo !== "ok" && geo !== "unsupported" && !city && (
              <button type="button" className="btn btn-ghost" onClick={onLocate} disabled={geo === "asking"}>
                Meinen Standort nutzen
              </button>
            )}
            <p className="geo" aria-live="polite">{city ? `Gesucht wird in ${city}.` : GEO_TEXT[geo]}</p>
            <form className="inline-form" onSubmit={submitCity}>
              <label htmlFor="city">Andere Stadt?</label>
              <div>
                <input id="city" value={cityDraft} onChange={(e) => setCityDraft(e.target.value)}
                  placeholder="z. B. Hamburg" maxLength={60} autoComplete="address-level2" />
                <button type="submit" className="btn btn-small">{city ? "Ändern" : "Übernehmen"}</button>
              </div>
            </form>
          </>
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
