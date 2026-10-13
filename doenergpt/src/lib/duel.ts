import { activeQuestions, complete } from "../data/questions";
import type { Answers } from "./types";

/** Was im Duell-Link steckt: Name und Antworten der ersten Person. */
export type Invite = { name: string; answers: Answers; city: string | null };

const b64url = {
  encode: (s: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: (s: string) =>
    new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))),
};

export function encodeInvite(i: Invite): string {
  return b64url.encode(JSON.stringify({ v: 1, n: i.name, a: i.answers, c: i.city }));
}

/** null bei kaputtem oder manipuliertem Link. */
export function decodeInvite(code: string): Invite | null {
  try {
    const raw = JSON.parse(b64url.decode(code)) as { v?: number; n?: unknown; a?: Record<string, unknown>; c?: unknown };
    if (raw.v !== 1 || typeof raw.n !== "string" || !raw.a) return null;
    const a = raw.a as Partial<Answers>;
    // Jede gestellte Frage muss eine erlaubte Antwort haben.
    for (const q of activeQuestions(a)) {
      if (!q.options.some((o) => o.value === a[q.key])) return null;
    }
    return { name: raw.n.slice(0, 30), answers: complete(a), city: typeof raw.c === "string" ? raw.c.slice(0, 60) : null };
  } catch {
    return null;
  }
}

export function inviteUrl(i: Invite, base: string): string {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("duell", encodeInvite(i));
  return u.toString();
}
