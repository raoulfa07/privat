# DönerGPT

Ein paar Fragen, ein Kassenbon, ein Essens-Tipp. Allein oder als Duell zu zweit, in Münster oder überall. Projektwissen steht in `CLAUDE.md`, die nächsten Schritte in `ROADMAP.md`.

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

Mit `GOOGLE_PLACES_KEY` kommen die Läden live aus Google Places. Ohne Key besteht der Seed aus 7 echten Läden mit öffentlich gefundener Adresse. Was fehlt und nachgetragen werden sollte:

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
- Variable `GOOGLE_PLACES_KEY` (Secret) für die Live-Suche
- Environment variable zum Launch: `VITE_LAUNCHED=true`, dann neu deployen
