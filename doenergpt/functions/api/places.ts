// Cloudflare Pages Function: GET /api/places
// Hält den Google-Key geheim. Ohne GOOGLE_PLACES_KEY gibt es die Demo-Läden.
import {
  DEMO_SHOPS, FIELD_MASK, fromGoogle, mergeRadar, textQuery,
  type GooglePlace, type PlacesResult,
} from "../../src/lib/places";
import type { Cuisine, Shop } from "../../src/lib/types";

type Env = { GOOGLE_PLACES_KEY?: string };
type Ctx = { request: Request; env: Env };

const CUISINES: Cuisine[] = ["doener", "asian", "burger", "indian", "any"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, max-age=300" },
  });

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const url = new URL(request.url);

  // Nur die eigene Seite darf suchen, sonst zahlt ihr für fremde Anfragen.
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);

  if (!env.GOOGLE_PLACES_KEY) {
    return json({ source: "demo", shops: DEMO_SHOPS, note: "Demo-Daten: nur Döner in Münster." } satisfies PlacesResult);
  }

  const cuisines = (url.searchParams.get("cuisine") ?? "any").split(",")
    .filter((c): c is Cuisine => (CUISINES as string[]).includes(c)).slice(0, 2);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const position = url.searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const city = url.searchParams.get("city")?.slice(0, 60) || null;
  const radius = Math.min(50000, Math.max(500, Number(url.searchParams.get("radius")) || 8000));

  try {
    const lists = await Promise.all((cuisines.length ? cuisines : ["any" as const]).map(async (cuisine) => {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GOOGLE_PLACES_KEY!,
          "x-goog-fieldmask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: textQuery(cuisine, { position, city }),
          languageCode: "de",
          regionCode: "DE",
          maxResultCount: 20,
          ...(position && !city
            ? { locationBias: { circle: { center: { latitude: position.lat, longitude: position.lng }, radius } } }
            : {}),
        }),
      });
      if (!res.ok) throw new Error(`places ${res.status}`);
      const data = (await res.json()) as { places?: GooglePlace[] };
      return (data.places ?? []).map((p) => fromGoogle(p, cuisine)).filter((s): s is Shop => s !== null);
    }));
    const seen = new Set<string>();
    const shops = lists.flat().filter((s) => !seen.has(s.id) && seen.add(s.id));
    return json({ source: "google", shops: mergeRadar(shops, DEMO_SHOPS) } satisfies PlacesResult);
  } catch {
    return json({ error: "Die Live-Suche hängt gerade." }, 502);
  }
}
