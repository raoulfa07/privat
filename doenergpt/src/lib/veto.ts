/** Veto-Karten: 3 pro Person und Woche, gespeichert auf diesem Gerät. */
export const VETOS_PER_WEEK = 3;

/** ISO-Woche als "2026-W42". */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const key = (name: string, now: Date) => `doenergpt.veto.${name.toLowerCase()}.${isoWeek(now)}`;

export function vetosLeft(name: string, now = new Date()): number {
  try {
    return Math.max(0, VETOS_PER_WEEK - Number(localStorage.getItem(key(name, now)) ?? 0));
  } catch {
    return VETOS_PER_WEEK;
  }
}

export function spendVeto(name: string, now = new Date()): number {
  const left = vetosLeft(name, now) - 1;
  try {
    localStorage.setItem(key(name, now), String(VETOS_PER_WEEK - Math.max(0, left)));
  } catch {
    // Kein Speicher (privates Fenster): Veto gilt trotzdem, wird nur nicht gezählt.
  }
  return Math.max(0, left);
}
