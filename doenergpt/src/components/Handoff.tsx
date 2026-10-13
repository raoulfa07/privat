import { useState } from "react";
import Head from "./Head";

type Props = {
  host: string;
  link: string;
  onSameDevice: () => void;
};

export default function Handoff({ host, link, onSameDevice }: Props) {
  const [status, setStatus] = useState("");
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function share() {
    try {
      await navigator.share({ title: "DönerGPT Duell", text: `${host} hat bestellt. Jetzt du.`, url: link });
    } catch {
      // Abgebrochen oder nicht erlaubt: Link bleibt unten zum Kopieren stehen.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Link kopiert.");
    } catch {
      setStatus("Kopieren ging nicht. Link unten markieren.");
    }
  }

  return (
    <>
      <Head sub="Duell-Modus" />
      <hr />
      <ul>
        <li><span>Bestellung 1 von 2</span><span>✓</span></li>
        <li><span>{host}</span><span>verdeckt</span></li>
      </ul>
      <hr />
      <div className="missing"><span>Fehlende Komponente</span><span>DU 2</span></div>
      <p className="intro">Jetzt die zweite Person. Was {host} bestellt hat, steht erst auf dem Kompromiss-Bon.</p>
      <button type="button" className="btn" onClick={onSameDevice}>Handy weitergeben</button>
      {canShare && <button type="button" className="btn btn-ghost" onClick={share}>Link schicken</button>}
      <button type="button" className="btn btn-ghost" onClick={copy}>Link kopieren</button>
      <p className="geo" aria-live="polite">{status}</p>
      <p className="link-text">{link}</p>
      <p className="foot">Danke für Ihren Einkauf ♥</p>
    </>
  );
}
