import { useEffect, useState } from "react";
import Sign from "./Sign";
import Receipt from "./Receipt";
import Start from "./Start";
import NameStep from "./NameStep";
import Questions, { type GeoState } from "./Questions";
import Handoff from "./Handoff";
import Thinking, { THINK_MS } from "./Thinking";
import Result from "./Result";
import DuoResult, { type Player } from "./DuoResult";
import { activeQuestions, complete } from "../data/questions";
import { recommend, recommendDuo, type DuoRecommendation, type Recommendation } from "../lib/recommend";
import { fetchShops, RADIUS_M } from "../lib/places";
import { decodeInvite, inviteUrl } from "../lib/duel";
import { reducedMotion } from "../lib/motion";
import { load, save } from "../lib/storage";
import type { Answers, LatLng } from "../lib/types";

type Phase = "start" | "name" | "questions" | "handoff" | "thinking" | "result";
type Mode = "solo" | "duo";

const TAGLINE: Record<Phase, string> = {
  start: "Jetzt geöffnet.",
  name: "Wer hat Hunger?",
  questions: "Wir hören zu.",
  handoff: "Halbzeit.",
  thinking: "Moment.",
  result: "Guten Hunger.",
};

const NAMES_KEY = "doenergpt.names";
const DEFAULT_NAMES = ["Charleen", "Raoul"];

type Outcome =
  | { kind: "solo"; rec: Recommendation; note?: string }
  | { kind: "duo"; rec: DuoRecommendation; note?: string };

/** Duell-Einladung aus der URL, einmal beim Laden. */
function readInvite() {
  const code = new URLSearchParams(window.location.search).get("duell");
  return code ? decodeInvite(code) : null;
}

export default function Flow() {
  const [invite] = useState(readInvite);
  const [mode, setMode] = useState<Mode>(invite ? "duo" : "solo");
  const [phase, setPhase] = useState<Phase>(invite ? "name" : "start");
  const [players, setPlayers] = useState<Player[]>(invite ? [invite] : []);
  const [name, setName] = useState<string | undefined>();
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [geo, setGeo] = useState<GeoState>("idle");
  const [position, setPosition] = useState<LatLng | null>(null);
  const [city, setCity] = useState<string | null>(invite?.city ?? null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [index, setIndex] = useState(0);
  const [printKey, setPrintKey] = useState(0);
  const reprint = () => setPrintKey((k) => k + 1);

  const knownNames = (() => {
    const saved = load(NAMES_KEY);
    return saved ? (JSON.parse(saved) as string[]) : DEFAULT_NAMES;
  })();

  function rememberName(n: string) {
    save(NAMES_KEY, JSON.stringify([n, ...knownNames.filter((x) => x.toLowerCase() !== n.toLowerCase())].slice(0, 4)));
  }

  function locate() {
    if (!("geolocation" in navigator)) return setGeo("unsupported");
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo("ok"); },
      () => setGeo("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function startSolo() { setMode("solo"); setPhase("questions"); }
  function startDuo() { setMode("duo"); setPhase("name"); }

  function pickName(n: string) {
    rememberName(n);
    setName(n);
    setPhase("questions");
  }

  function answer(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (activeQuestions(next).some((q) => next[q.key] === undefined)) return;
    const done = complete(next);

    if (mode === "duo" && players.length === 0) {
      setPlayers([{ name: name!, answers: done }]);
      setPhase("handoff");
      reprint();
      return;
    }
    const all = mode === "duo" ? [...players, { name: name!, answers: done }] : [];
    if (mode === "duo") setPlayers(all);
    void compute(done, all);
  }

  async function compute(mine: Answers, all: Player[]) {
    const duo = all.length === 2;
    const cuisines = duo ? [...new Set(all.map((p) => p.answers.cuisine))] : [mine.cuisine];
    const widest: number = duo ? Math.max(...all.map((p) => RADIUS_M[p.answers.distance])) : RADIUS_M[mine.distance];
    const slow = !reducedMotion();
    if (slow) setPhase("thinking");
    const [found] = await Promise.all([
      fetchShops({ cuisines: cuisines.includes("any") ? ["any"] : cuisines, position, city, radius: widest }),
      slow ? new Promise((r) => setTimeout(r, THINK_MS)) : null,
    ]);
    const shops = found.shops;
    // Einmal rechnen und festhalten, damit „überrascht werden“ nicht bei jedem Render neu würfelt.
    setOutcome(duo
      ? { kind: "duo", rec: recommendDuo(all[0].answers, all[1].answers, shops, { position }), note: found.note }
      : { kind: "solo", rec: recommend(mine, shops, { position }), note: found.note });
    setIndex(0);
    setPhase("result");
    reprint();
  }

  function secondPlayer() {
    setAnswers({});
    setName(undefined);
    setPhase("name");
    reprint();
  }

  function restart() {
    setAnswers({});
    setName(undefined);
    setOutcome(null);
    setPlayers([]);
    if (invite) window.history.replaceState(null, "", window.location.pathname);
    setPhase(mode === "duo" ? "name" : "questions");
    reprint();
  }

  function next() {
    setIndex((i) => i + 1);
    reprint();
  }

  // Zurück-Taste im Browser soll nicht mitten im Bon aus der App fallen.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [printKey]);

  const host = players[0];
  const empty = outcome && outcome.rec.ranked.length === 0;

  return (
    <>
      <Sign tagline={TAGLINE[phase]} />
      <Receipt key={printKey} fast={printKey > 0}>
        {phase === "start" && <Start onSolo={startSolo} onDuo={startDuo} />}
        {phase === "name" && (
          <NameStep
            title={host ? "Und wer bist du?" : "Wer bestellt zuerst?"}
            intro={host ? `${host.name} hat schon bestellt. Was, verrät erst der Kompromiss-Bon.` : undefined}
            suggestions={knownNames}
            exclude={host?.name}
            onDone={pickName}
          />
        )}
        {phase === "questions" && (
          <Questions answers={answers} player={mode === "duo" ? name : undefined} onAnswer={answer}
            geo={geo} onLocate={locate} city={city} onCity={setCity} />
        )}
        {phase === "handoff" && host && (
          <Handoff host={host.name} link={inviteUrl({ ...host, city }, window.location.href)} onSameDevice={secondPlayer} />
        )}
        {phase === "thinking" && <Thinking />}
        {phase === "result" && empty && (
          <>
            <p className="fallback">{outcome.note ?? "Nichts gefunden."}</p>
            <button type="button" className="btn" onClick={restart}>Nochmal</button>
          </>
        )}
        {phase === "result" && !empty && outcome?.kind === "solo" && (
          <Result answers={complete(answers)} rec={outcome.rec} index={index} note={outcome.note} onNext={next} onRestart={restart} />
        )}
        {phase === "result" && !empty && outcome?.kind === "duo" && (
          <DuoResult players={players as [Player, Player]} rec={outcome.rec} index={index} note={outcome.note}
            onNext={next} onRestart={restart} />
        )}
      </Receipt>
    </>
  );
}
