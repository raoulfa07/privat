import { useEffect, useRef } from "react";
import Head from "./Head";
import { fmtKm, orderLines, reasonLine } from "../lib/order";
import type { Recommendation } from "../lib/recommend";
import type { Answers } from "../lib/types";

type Props = {
  answers: Answers;
  rec: Recommendation;
  index: number;
  onNext: () => void;
  onRestart: () => void;
};

function bonNumber(answers: Answers): string {
  let h = 7;
  for (const c of Object.values(answers).join("|")) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return String(h).padStart(4, "0");
}

const fmtRating = (r: number | null) =>
  r === null ? "noch nicht getestet" : `${r.toLocaleString("de-DE", { maximumFractionDigits: 1 })}/5`;

export default function Result({ answers, rec, index, onNext, onRestart }: Props) {
  const r = rec.ranked[index % rec.ranked.length];
  const [item, ...extras] = orderLines(answers, r);
  const now = new Date();
  const titleRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => titleRef.current?.focus(), [index]);

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.shop.name}, ${r.shop.address}, Münster`)}`;
  const isLast = index % rec.ranked.length === rec.ranked.length - 1;

  return (
    <>
      <Head sub={`Bon #${bonNumber(answers)} · ${now.toLocaleDateString("de-DE")}`} />
      <hr />
      {rec.fallback && index === 0 && (
        <p className="fallback">Fallback aktiviert: Pizza? Nein. Nie.<br />Hier ist der bestbewertete Laden.</p>
      )}
      <div className="missing"><span>Heute für dich</span><span>{index === 0 ? "#1" : `#${(index % rec.ranked.length) + 1}`}</span></div>
      <p className="shop" ref={titleRef} tabIndex={-1}>{r.shop.name}</p>
      <ul>
        <li><span>Stadtteil</span><span>{r.shop.district}</span></li>
        <li><span>Adresse</span><span>{r.shop.address}</span></li>
        {r.distanceKm !== null && <li><span>Entfernung</span><span>{fmtKm(r.distanceKm)}</span></li>}
        <li><span>Radar</span><span>{fmtRating(r.shop.radarRating)}</span></li>
      </ul>
      <hr />
      <p className="label">Bestellung</p>
      <ul>
        <li><span>1x {item}</span><span>✓</span></li>
        {extras.map((e) => <li key={e} className="sub"><span>{e}</span></li>)}
      </ul>
      <hr />
      <p className="reason">{reasonLine(answers, r)}</p>
      <hr />
      <ul className="links">
        {r.shop.reviewUrl && <li><a href={r.shop.reviewUrl} target="_blank" rel="noopener noreferrer">Zum Review</a><span>→</span></li>}
        <li><a href={maps} target="_blank" rel="noopener noreferrer">Route</a><span>→</span></li>
      </ul>
      <button type="button" className="btn" onClick={onNext}>
        {isLast ? "Von vorn durchgehen" : "Anderer Vorschlag"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onRestart}>Nochmal</button>
      <p className="foot">
        Vorschlag {(index % rec.ranked.length) + 1} von {rec.ranked.length}
        <br />
        Danke für Ihren Einkauf ♥
      </p>
    </>
  );
}
