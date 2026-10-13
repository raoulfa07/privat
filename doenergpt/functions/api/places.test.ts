import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestGet } from "./places";

const req = (qs: string, headers: Record<string, string> = {}) =>
  new Request(`https://doenergpt.pages.dev/api/places?${qs}`, { headers });

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/places", () => {
  it("liefert ohne Key die Demo-Läden", async () => {
    const res = await onRequestGet({ request: req("cuisine=doener"), env: {} });
    const body = await res.json();
    expect(body.source).toBe("demo");
    expect(body.shops.length).toBeGreaterThan(0);
  });

  it("blockt fremde Seiten", async () => {
    const res = await onRequestGet({ request: req("cuisine=doener", { origin: "https://evil.example" }), env: { GOOGLE_PLACES_KEY: "k" } });
    expect(res.status).toBe(403);
  });

  it("fragt Google pro Küche und mappt das Ergebnis", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const q = JSON.parse(String(init.body)).textQuery as string;
      return new Response(JSON.stringify({ places: [{
        id: q, displayName: { text: q }, location: { latitude: 53.55, longitude: 10 }, rating: 4.4, userRatingCount: 50,
      }] }), { headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await onRequestGet({ request: req("cuisine=doener,asian&city=Hamburg"), env: { GOOGLE_PLACES_KEY: "k" } });
    const body = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body.source).toBe("google");
    expect(body.shops.map((s: { name: string; cuisine: string }) => `${s.name}|${s.cuisine}`))
      .toEqual(["Döner in Hamburg|doener", "asiatisches Restaurant in Hamburg|asian"]);
    const init = fetchMock.mock.calls[0][1];
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
  });

  it("meldet einen Fehler, wenn Google streikt", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const res = await onRequestGet({ request: req("cuisine=doener"), env: { GOOGLE_PLACES_KEY: "k" } });
    expect(res.status).toBe(502);
  });
});
