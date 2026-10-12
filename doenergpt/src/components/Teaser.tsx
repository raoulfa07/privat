import { useState } from "react";
import Sign from "./Sign";
import Receipt from "./Receipt";
import ProgressBar from "./ProgressBar";

const LINES = [
  "Fehler 404: Modell noch nicht trainiert.",
  "Erst bauen, dann essen.",
  "Tipp: Entwicklerin mitbringen.",
  "Fallback aktiviert: Pizza? Nein. Nie.",
];

export default function Teaser() {
  const [clicks, setClicks] = useState(0);
  const answer = clicks === 0 ? "" : LINES[(clicks - 1) % LINES.length];

  return (
    <>
      <Sign tagline="Bald geöffnet. Versprochen." />
      <Receipt>
        <div className="head">
          <h2>DÖNER GPT</h2>
          <p>powered by Hunger</p>
        </div>
        <hr />
        <dl>
          <dt>Modell</dt>
          <dd>dönergpt-1 (mit alles)</dd>
          <dt>Prompt</dt>
          <dd>„Was essen wir heute?"</dd>
          <dt>Status</dt>
          <dd>
            wird geladen
            <ProgressBar value={50} stall label="Ladestand" />
          </dd>
        </dl>
        <hr />
        <ul>
          <li><span>1x Gemeinsames Projekt</span><span>✓</span></li>
          <li><span>1x Abend am Laptop</span><span>✓</span></li>
          <li><span>1x Döner zur Belohnung</span><span>✓</span></li>
        </ul>
        <hr />
        <div className="missing"><span>Fehlende Komponente</span><span>DU</span></div>
        <hr />
        <p className="q">
          <b>Frage 1 von 5:</b> Wie hungrig bist du, auf einer Skala von Beilagensalat bis Dürüm XXL?
        </p>
        <button type="button" className="btn" onClick={() => setClicks((n) => n + 1)}>
          Bestellung aufgeben
        </button>
        <p className="answer" aria-live="polite">{answer}</p>
        <p className="foot">
          Release: gemeinsam festlegen
          <br />
          Danke für Ihren Einkauf ♥
        </p>
      </Receipt>
    </>
  );
}
