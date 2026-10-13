import { forwardRef } from "react";
import { fmtKm } from "../lib/order";
import type { Ranked } from "../lib/recommend";

const stars = (r: number) => r.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/** Name, Lage und Wertung eines Ladens als Bon-Zeilen. */
const ShopBlock = forwardRef<HTMLParagraphElement, { r: Ranked; rank: number; duo?: boolean }>(function ShopBlock({ r, rank, duo = false }, ref) {
  const s = r.shop;
  return (
    <>
      <div className="missing"><span>Heute für {duo ? "euch" : "dich"}</span><span>#{rank}</span></div>
      <p className="shop" ref={ref} tabIndex={-1}>{s.name}</p>
      <ul>
        {s.district && <li><span>Stadtteil</span><span>{s.district}</span></li>}
        <li><span>Adresse</span><span>{s.address}</span></li>
        {r.distanceKm !== null && <li><span>Entfernung</span><span>{fmtKm(r.distanceKm)}</span></li>}
        {s.openNow !== null && <li><span>Jetzt</span><span>{s.openNow ? "offen" : "zu"}</span></li>}
        {s.radarRating !== null && <li><span>Radar</span><span>{stars(s.radarRating)}/5</span></li>}
        {s.googleRating !== null && (
          <li><span>Google</span><span>{stars(s.googleRating)}★ ({s.ratingCount ?? 0})</span></li>
        )}
        {s.radarRating === null && s.googleRating === null && <li><span>Radar</span><span>noch nicht getestet</span></li>}
      </ul>
    </>
  );
});

export default ShopBlock;

export function mapsLink(r: Ranked): string {
  return r.shop.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.shop.name}, ${r.shop.address}`)}`;
}
