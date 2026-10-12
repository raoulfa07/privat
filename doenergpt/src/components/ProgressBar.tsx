type Props = {
  value: number;
  /** Nur Teaser: Balken zuckt zwischen value-6 und value, wie ein hängender Download. */
  stall?: boolean;
  label: string;
};

export default function ProgressBar({ value, stall = false, label }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="bar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span>
        <i className={stall ? "stall" : undefined} style={{ width: `${pct}%` }} />
      </span>
      {pct}%
    </div>
  );
}
