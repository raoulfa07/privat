import { useState, type FormEvent } from "react";
import Head from "./Head";

type Props = {
  title: string;
  intro?: string;
  /** Schnellauswahl, z. B. die zuletzt benutzten Namen. */
  suggestions: string[];
  exclude?: string;
  onDone: (name: string) => void;
};

export default function NameStep({ title, intro, suggestions, exclude, onDone }: Props) {
  const [name, setName] = useState("");
  const chips = suggestions.filter((s) => s && s.toLowerCase() !== exclude?.toLowerCase());

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n) onDone(n);
  }

  return (
    <>
      <Head sub="Duell-Modus" />
      <hr />
      {intro && <p className="intro">{intro}</p>}
      <p className="q"><b>{title}</b></p>
      {chips.length > 0 && (
        <div className="options">
          {chips.map((c) => (
            <button key={c} type="button" className="opt" onClick={() => onDone(c)}>
              <span className="box" aria-hidden="true" />
              {c}
            </button>
          ))}
        </div>
      )}
      <form className="inline-form" onSubmit={submit}>
        <label htmlFor="player-name">{chips.length ? "Jemand anderes" : "Name"}</label>
        <div>
          <input id="player-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="given-name" />
          <button type="submit" className="btn btn-small">Weiter</button>
        </div>
      </form>
      <p className="foot">Danke für Ihren Einkauf ♥</p>
    </>
  );
}
