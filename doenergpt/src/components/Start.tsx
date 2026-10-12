import Head from "./Head";

type Props = { onStart: () => void };

export default function Start({ onStart }: Props) {
  return (
    <>
      <Head sub="powered by Hunger" />
      <hr />
      <dl>
        <dt>Modell</dt>
        <dd>dönergpt-1 (mit alles)</dd>
        <dt>Prompt</dt>
        <dd>„Was essen wir heute?"</dd>
        <dt>Status</dt>
        <dd>bereit</dd>
      </dl>
      <hr />
      <ul>
        <li><span>5x Frage</span><span>✓</span></li>
        <li><span>1x Empfehlung</span><span>✓</span></li>
        <li><span>0x Pizza</span><span>✓</span></li>
      </ul>
      <hr />
      <div className="missing"><span>Fehlende Komponente</span><span>DU</span></div>
      <button type="button" className="btn" onClick={onStart}>
        Bestellung aufgeben
      </button>
      <p className="foot">Danke für Ihren Einkauf ♥</p>
    </>
  );
}
