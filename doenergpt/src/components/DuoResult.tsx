import { useCallback, useEffect, useRef, useState } from "react";
import Head from "./Head";
import ShopBlock, { mapsLink } from "./ShopBlock";
import Spin from "./Spin";
import { bonNumber } from "./Result";
import { orderLines, reasonLine, sacrifices } from "../lib/order";
import { reducedMotion } from "../lib/motion";
import { spendVeto, vetosLeft } from "../lib/veto";
import type { DuoRecommendation } from "../lib/recommend";
import type { Answers } from "../lib/types";

export type Player = { name: string; answers: Answers };

type Props = {
  players: [Player, Player];
  rec: DuoRecommendation;
  index: number;
  note?: string;
  onNext: () => void;
  onRestart: () => void;
};

export default function DuoResult({ players, rec, index, note, onNext, onRestart }: Props) {
  const n = rec.ranked.length;
  const r = rec.ranked[index % n];
  const surprise = players.some((p) => p.answers.mood === "surprise");
  const [spinning, setSpinning] = useState(surprise && index === 0 && n > 1 && !reducedMotion());
  const endSpin = useCallback(() => setSpinning(false), []);
  const [vetos, setVetos] = useState(() => players.map((p) => vetosLeft(p.name)));
  const [vetoBy, setVetoBy] = useState<string | null>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (!spinning) titleRef.current?.focus(); }, [index, spinning]);

  function veto(i: number) {
    const left = spendVeto(players[i].name);
    setVetos((v) => v.map((x, j) => (j === i ? left : x)));
    setVetoBy(players[i].name);
    onNext();
  }

  const scored = [r.a, r.b];
  const seed = players.map((p) => p.name + Object.values(p.answers).join("|")).join("/");

  return (
    <>
      <Head sub={`Kompromiss-Bon #${bonNumber(seed)} · ${new Date().toLocaleDateString("de-DE")}`} />
      <hr />
      {spinning ? (
        <Spin names={rec.ranked.slice(0, 3).map((x) => x.shop.name)} onDone={endSpin} />
      ) : (
        <>
          {rec.fallback && index === 0 && (
            <p className="fallback">Ihr seid euch in nichts einig.<br />Fallback aktiviert: Pizza? Nein. Nie.</p>
          )}
          {vetoBy && <p className="fallback">Veto von {vetoBy}. Nächster Versuch.</p>}
          <ShopBlock r={r} rank={(index % n) + 1} duo ref={titleRef} />
          {players.map((p, i) => {
            const [item, ...extras] = orderLines(p.answers, r.shop);
            const lost = sacrifices(p.answers, r.shop, scored[i]);
            return (
              <section key={p.name} aria-label={`Bestellung ${p.name}`}>
                <hr />
                <p className="label">{p.name}</p>
                <ul>
                  <li><span>1x {item}</span><span>✓</span></li>
                  {extras.map((e) => <li key={e} className="sub"><span>{e}</span></li>)}
                  <li><span>Verzichtet auf</span><span>{lost.length ? lost.join(", ") : "nichts"}</span></li>
                </ul>
                <p className="reason small">{reasonLine(p.answers, { ...r, reasons: scored[i].reasons })}</p>
              </section>
            );
          })}
          <hr />
          <ul className="links">
            {r.shop.reviewUrl && <li><a href={r.shop.reviewUrl} target="_blank" rel="noopener noreferrer">Zum Review</a><span>→</span></li>}
            <li><a href={mapsLink(r)} target="_blank" rel="noopener noreferrer">Route</a><span>→</span></li>
          </ul>
          <div className="veto-row">
            {players.map((p, i) => (
              <button key={p.name} type="button" className="btn btn-veto" onClick={() => veto(i)} disabled={vetos[i] === 0}>
                Veto {p.name}
                <span className="veto-cards" aria-hidden="true">{"▮".repeat(vetos[i])}{"▯".repeat(3 - vetos[i])}</span>
                <span className="sr-only">, noch {vetos[i]} von 3</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onRestart}>Neues Duell</button>
        </>
      )}
      <p className="foot">
        {note && <>{note}<br /></>}
        Vorschlag {(index % n) + 1} von {n} · 3 Vetos pro Woche
        <br />
        Danke für Ihren Einkauf ♥
      </p>
    </>
  );
}
