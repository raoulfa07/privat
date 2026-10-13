import { describe, expect, it } from "vitest";
import { decodeInvite, encodeInvite, inviteUrl } from "./duel";
import { answers } from "./fixtures";

describe("Duell-Link", () => {
  const invite = { name: "Charleen", answers: answers({ meat: "veggie", sauce: "all" }), city: "Köln" };

  it("übersteht Hin- und Rückweg, auch mit Umlauten", () => {
    expect(decodeInvite(encodeInvite(invite))).toEqual(invite);
    expect(decodeInvite(encodeInvite({ ...invite, name: "Jürgen Döner" }))?.name).toBe("Jürgen Döner");
  });

  it("baut einen Link mit dem Code und ohne alten Code", () => {
    const u = new URL(inviteUrl(invite, "https://doenergpt.pages.dev/?duell=alt#x"));
    expect(u.hash).toBe("");
    expect(decodeInvite(u.searchParams.get("duell")!)).toEqual(invite);
  });

  it("lehnt kaputte oder manipulierte Links ab", () => {
    expect(decodeInvite("kaputt")).toBeNull();
    const evil = btoa(JSON.stringify({ v: 1, n: "x", a: { ...invite.answers, meat: "<script>" } }));
    expect(decodeInvite(evil)).toBeNull();
    const missing = btoa(JSON.stringify({ v: 1, n: "x", a: { hunger: "xxl" } }));
    expect(decodeInvite(missing)).toBeNull();
  });

  it("füllt die Soße auf, wenn sie nicht gefragt wurde", () => {
    const asian = { ...invite, answers: answers({ cuisine: "asian", sauce: null }) };
    const { sauce, ...rest } = asian.answers;
    void sauce;
    const code = btoa(JSON.stringify({ v: 1, n: "x", a: rest, c: null }));
    expect(decodeInvite(code)?.answers.sauce).toBeNull();
  });
});
