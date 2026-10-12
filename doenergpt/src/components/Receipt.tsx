import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
  /** Nachdrucke kommen schneller raus als der erste Bon. */
  fast?: boolean;
};

// Bon-Schlitz plus Bon, der sich per steps()-Animation herausdruckt.
// Neuer key am Aufrufer = Bon druckt sich neu.
export default function Receipt({ children, label, fast = false }: Props) {
  return (
    <>
      <div className="slot" aria-hidden="true" />
      <div className="clip">
        <main className={fast ? "receipt fast" : "receipt"} aria-label={label}>
          {children}
        </main>
      </div>
    </>
  );
}
