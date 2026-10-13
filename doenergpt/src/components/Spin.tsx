import { useEffect, useState } from "react";

type Props = { names: string[]; onDone: () => void };

export const SPIN_MS = 1600;

/**
 * „Ich will überrascht werden“: der Spieß dreht sich über die Top-Kandidaten
 * und bleibt beim ersten stehen. Wird bei reduzierter Bewegung übersprungen.
 */
export default function Spin({ names, onDone }: Props) {
  const [i, setI] = useState(0);
  useEffect(() => {
    let tick = 0;
    const total = 12 + names.length;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      tick++;
      if (tick >= total) { setI(0); t = setTimeout(onDone, 350); return; }
      setI(tick % names.length);
      // Wird langsamer, wie ein Spieß, der ausläuft.
      t = setTimeout(step, 50 + (tick / total) ** 2 * 220);
    };
    t = setTimeout(step, 60);
    return () => clearTimeout(t);
  }, [names, onDone]);

  return (
    <div className="spin" role="status" aria-label="Spieß dreht sich">
      <div className="spit" aria-hidden="true" />
      <p className="spin-name">{names[i]}</p>
    </div>
  );
}
