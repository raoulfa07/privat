import Head from "./Head";

type Props = { onSolo: () => void; onDuo: () => void };

export default function Start({ onSolo, onDuo }: Props) {
  return (
    <>
      <Head sub="powered by Hunger" />
      <hr />
      <dl>
        <dt>Modell</dt>
        <dd>dönergpt-2 (jetzt wirklich mit alles)</dd>
        <dt>Prompt</dt>
        <dd>„Was essen wir heute?"</dd>
        <dt>Status</dt>
        <dd>bereit</dd>
      </dl>
      <hr />
      <ul>
        <li><span>1x Fragerunde</span><span>✓</span></li>
        <li><span>1x Empfehlung</span><span>✓</span></li>
        <li><span>0x Pizza</span><span>✓</span></li>
      </ul>
      <hr />
      <div className="missing"><span>Fehlende Komponente</span><span>DU</span></div>
      <button type="button" className="btn" onClick={onSolo}>
        Bestellung aufgeben
      </button>
      <button type="button" className="btn btn-ghost" onClick={onDuo}>
        Zu zweit bestellen (Duell)
      </button>
      <p className="foot">Danke für Ihren Einkauf ♥</p>
    </>
  );
}
