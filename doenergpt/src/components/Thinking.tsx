import { useEffect, useState } from "react";
import Head from "./Head";
import ProgressBar from "./ProgressBar";

export const THINK_LINES = [
  "Spieß wird gedreht…",
  "Soße wird abgeschmeckt…",
  "Zwiebeln werden gezählt…",
  "Pizza wird ausgeschlossen…",
];
export const THINK_MS = 1400;

export default function Thinking() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((x) => Math.min(THINK_LINES.length, x + 1)), THINK_MS / THINK_LINES.length);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <Head sub="dönergpt-1 denkt nach" />
      <hr />
      <dl>
        <dt>Status</dt>
        <dd>
          rechnet
          <ProgressBar value={(n / THINK_LINES.length) * 100} label="Berechnung" />
        </dd>
      </dl>
      <hr />
      <ul aria-live="polite">
        {THINK_LINES.slice(0, n).map((l) => (
          <li key={l} className="printed"><span>{l}</span></li>
        ))}
      </ul>
      <p className="foot">Danke für Ihren Einkauf ♥</p>
    </>
  );
}
