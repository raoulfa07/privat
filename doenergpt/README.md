# DönerGPT

5 Fragen, ein Kassenbon, ein Döner-Tipp für Münster. Kein echtes LLM, nur Scoring.

```bash
npm install
npm run dev      # lokal
npm run build    # Ausgabe in dist/
npm test         # recommend() und Bon-Texte
```

## Teaser oder echter Flow

Ohne Variable steht der „coming soon“-Teaser. `VITE_LAUNCHED=true` (Build-Variable) schaltet auf den Flow um.
Lokal ansehen: `VITE_LAUNCHED=true npm run dev`.

## Daten

`src/data/shops.json`. Feldbedeutung steht in `src/lib/types.ts`. `null` heißt „wissen wir nicht“ und zählt im Scoring nicht.

Der Seed besteht aus 7 echten Läden mit öffentlich gefundener Adresse. Was fehlt und nachgetragen werden sollte:

- `radarRating` (0–5): eure Döner-Radar-Wertung. Ohne sie steht auf dem Bon „noch nicht getestet“, und bei Gleichstand gewinnt alphabetisch der erste.
- `reviewUrl`: Link zum Instagram-Post. Dann erscheint „Zum Review“ auf dem Bon.
- `veggie`, `calf`, `chicken`, `bigPortions`, `spicy`, `seating`: aus euren Reviews.
- `lat`/`lng` sind grob aus der Adresse geschätzt. Bitte in Google Maps prüfen (Rechtsklick auf den Laden zeigt die Koordinaten).

## Standort

Nur auf Knopfdruck bei Frage 4 („Meinen Standort nutzen“). Wird nicht gespeichert und nicht verschickt, die Rechnung passiert im Browser. Ohne Standort zählt Frage 4 nicht.

## Deployment (Cloudflare Pages)

Workers & Pages → Create → Pages → Connect to Git → `raoulfa07/privat`

- Root directory: `doenergpt`
- Build command: `npm run build`
- Build output: `dist`
- Environment variable zum Launch: `VITE_LAUNCHED=true`, dann neu deployen
