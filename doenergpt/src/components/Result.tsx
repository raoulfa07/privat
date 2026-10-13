import { useCallback, useEffect, useRef, useState } from "react";
import Head from "./Head";
import ShopBlock, { mapsLink } from "./ShopBlock";
import Spin from "./Spin";
import { orderLines, reasonLine } from "../lib/order";
import { reducedMotion } from "../lib/motion";
import type { Recommendation } from "../lib/recommend";
import type { Answers } from "../lib/types";

type Props = {
  answers: Answers;
  rec: Recommendation;
  index: number;
  note?: string;
  onNext: () => void;
  onRestart: () => void;
};

export function bonNumber(seed: string): string {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return String(h).padStart(4, "0");
}

export default function Result({ answers, rec, index, note, onNext, onRestart }: Props) {
  const n = rec.ranked.length;
  const r = rec.ranked[index % n];
  const [spinning, setSpinning] = useState(answers.mood === "surprise" && index === 0 && n > 1 && !reducedMotion());
  const endSpin = useCallback(() => setSpinning(false), []);
  const titleRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (!spinning) titleRef.current?.focus(); }, [index, spinning]);

  const [item, ...extras] = orderLines(answers, r.shop);
  const isLast = index % n === n - 1;

  return (
    <>
      <Head sub={`Bon #${bonNumber(Object.values(answers).join("|"))} · ${new Date().toLocaleDateString("de-DE")}`} />
      <hr />
      {spinning ? (
        <Spin names={rec.ranked.slice(0, 3).map((x) => x.shop.name)} onDone={endSpin} />
      ) : (
        <>
          {rec.fallback && index === 0 && (
            <p className="fallback">Fallback aktiviert: Pizza? Nein. Nie.<br />Hier ist der bestbewertete Laden.</p>
          )}
          <ShopBlock r={r} rank={(index % n) + 1} ref={titleRef} />
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
            <li><a href={mapsLink(r)} target="_blank" rel="noopener noreferrer">Route</a><span>→</span></li>
          </ul>
          <button type="button" className="btn" onClick={onNext}>
            {isLast ? "Von vorn durchgehen" : "Anderer Vorschlag"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onRestart}>Nochmal</button>
        </>
      )}
      <p className="foot">
        {note && <>{note}<br /></>}
        Vorschlag {(index % n) + 1} von {n}
        <br />
        Danke für Ihren Einkauf ♥
      </p>
    </>
  );
}
