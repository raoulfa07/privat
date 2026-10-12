import type { ReactNode } from "react";

type Props = { children: ReactNode; label?: string };

// Bon-Schlitz plus Bon, der sich per steps()-Animation herausdruckt.
// Neuer key am Aufrufer = Bon druckt sich neu.
export default function Receipt({ children, label }: Props) {
  return (
    <>
      <div className="slot" aria-hidden="true" />
      <div className="clip">
        <main className="receipt" aria-label={label}>
          {children}
        </main>
      </div>
    </>
  );
}
