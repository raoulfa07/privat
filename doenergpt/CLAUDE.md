# DönerGPT

Essens-Entscheidungshilfe von Raoul und Charleen. Ein paar Fragen beantworten, DönerGPT druckt einen Kassenbon mit der Empfehlung. Allein oder als Duell zu zweit. Gehört zu Döner Radar (Instagram: @muenster.isst.doener).

Was als Nächstes kommt: `ROADMAP.md`.

## Befehle

```bash
npm install
VITE_LAUNCHED=true npm run dev   # echter Flow (ohne Variable: „coming soon“-Teaser)
npm test                         # vitest, muss grün sein
npm run build                    # tsc + vite, ohne Fehler und Warnungen
```

## Aufbau

- `src/lib/recommend.ts` ist das Herz: `scoreShop`, `recommend`, `recommendDuo`. Reine Funktionen, deterministisch außer bei „Ich will überrascht werden“ (Zufall wird injiziert). Jede Änderung hier braucht Tests.
- `src/lib/order.ts`: Bestellzeilen, Begründungssatz, „Verzichtet auf“.
- `src/lib/places.ts`: Google-Places-Mapping und `fetchShops()`. Schlägt die Live-Suche fehl, gibt es die Demo-Läden.
- `functions/api/places.ts`: Cloudflare Pages Function, hält `GOOGLE_PLACES_KEY` geheim. Ohne Key liefert sie die Demo-Läden.
- `src/lib/duel.ts`: Duell-Link. Die Antworten der ersten Person stecken base64-kodiert in `?duell=`, es gibt keinen Server-State.
- `src/lib/veto.ts`: 3 Veto-Karten pro Person und ISO-Woche in localStorage.
- `src/data/questions.ts`: Fragen. `when` blendet Fragen aus (Soße nur bei Döner).
- `src/data/shops.json`: eigene Läden (Seed und Döner-Radar-Daten). Werden über Google-Treffer gelegt (`mergeRadar`).
- `src/components/Flow.tsx`: Ablauf als State-Machine (start → name → questions → handoff → thinking → result).

## Regeln

- **Keine erfundenen Daten.** `null` heißt unbekannt und zählt im Scoring nicht. Keine Bewertungen, Merkmale oder Läden ausdenken.
- **Ton:** Deutsch, Du-Form, kurz, trocken. Running Gags: „mit alles“, „Pizza? Nein. Nie.“. Keine Floskeln.
- **Design:** Thermodrucker-Bon. Tokens stehen oben in `src/styles.css`: `--sign`, `--paper`, `--ink`, `--faded`, `--sauce`. Schriften: Bowlby One fürs Schild, Courier Prime für den Bon. Keine Rundungen und Schatten auf dem Bon. Im Dark Mode wird nur das Schild dunkler.
- **Teaser:** `src/components/Teaser.tsx` ist pixelgleich mit dem Original. Nicht anfassen, solange `VITE_LAUNCHED` nicht gesetzt ist.
- **A11y:** echte Buttons, sichtbarer Fokus (`outline: 3px solid var(--sauce)`), `prefers-reduced-motion` respektieren (keine Druck- und Spieß-Animation, keine Denkpause). Kein Text in `::before`, der landet im Screenreader-Namen.
- **Mobile first:** bei 360 px Breite prüfen, kein seitliches Scrollen.
- **Privatsphäre:** Standort nur auf Knopfdruck, wird nicht gespeichert. Kein Tracking, keine Cookies.
- **Secrets** nur als Cloudflare-Umgebungsvariablen, nie im Code oder in `.env`-Dateien im Repo.
