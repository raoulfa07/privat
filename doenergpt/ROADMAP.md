# Roadmap

## Fertig

- **Phase 1, überall statt nur Münster:** Google Places über `/api/places` mit Küchenwahl (Döner, Asiatisch, Burger, Indisch, Egal), Stadt-Eingabe, Standort, „jetzt offen“ und Google-Sternen, die bei wenigen Bewertungen Richtung 4,0 gezogen werden. Eigene Radar-Läden bekommen einen Bonus. Ohne Key laufen die Demo-Daten (7 Döner in Münster).
- **Phase 2, Duell:** Beide antworten verdeckt, entweder auf einem Handy (weitergeben) oder per Link. Der Kompromiss-Bon zeigt beide Bestellungen und „Verzichtet auf“. Dazu Veto-Karten, 3 pro Woche.
- **Spieß drehen** bei „Ich will überrascht werden“.

## Als Nächstes

### Live schalten
1. Cloudflare Pages: Repo verbinden, Root `doenergpt`, Build `npm run build`, Output `dist`.
2. Google Cloud: Places API (New) aktivieren, Key auf die Places API beschränken und als `GOOGLE_PLACES_KEY` in Cloudflare hinterlegen.
3. Budget-Alarm in Google Cloud setzen. `/api/places` blockt fremde Origins, hat aber noch kein Tageslimit (siehe Phase 4, KV).
4. Zum Launch `VITE_LAUNCHED=true` setzen.

### Phase 3, KI
- **Freitext:** Neue Function `functions/api/understand.ts`. Sie bekommt einen Satz („was Warmes, nicht teuer, Charleen will kein Fleisch, wir sind in Hamburg“) und gibt ein `Partial<Answers>` plus `city` zurück. Claude über die Anthropic API mit Structured Output bzw. Tool-Schema, damit nur erlaubte Werte aus `questions.ts` rauskommen. Danach normal `recommend()`. Fehlende Antworten fragt der Bon nach.
- **Sprache:** Mikrofon-Button mit Web Speech API (`webkitSpeechRecognition`, `lang: "de-DE"`). Gibt es die API nicht, wird der Button nicht angezeigt.
- **Begründung:** Optional schreibt Claude den Grund-Satz im Bon-Ton. Input sind nur die Fakten aus `Ranked` (Name, Gründe, Entfernung). Die KI wählt keinen Laden und erfindet keine Eigenschaften.
- Key als `ANTHROPIC_API_KEY` in Cloudflare. Modell- und API-Details: in Claude Code den Skill `claude-api` laden.

### Phase 4, Gedächtnis
- **Speicher:** Cloudflare D1 (Tabelle `visits`: shop_id, name, datum, person, sterne, satz) und KV für das Tageslimit.
- **„Wie war's?“:** Am Tag nach einem Bon fragt die Startseite nach Sternen und einem Satz. Die Bewertung fließt als eigene Wertung ins Scoring, analog `radarRating`.
- **Jahresliste:** Zähler „Jahresziel: x/8 neue Döner“ auf dem Bon. Ein Laden zählt als neu, wenn er noch keinen Eintrag in `visits` hat. Die Liste steht in `../public/story.js` (`goals`).
- **Essens-Wrapped** im Dezember: ein Bon mit eurem Jahr. Meistbesuchter Laden, Veto-Königin bzw. -König, Kilometer für Döner.
- **Muster:** Die KI schaut über `visits` und sagt Dinge wie „Ihr bewertet scharf immer besser“.

### Kleinkram
- Eingang aus dem Raum „Küche“ der Erinnerungsseite (`../public/index.html`), sobald die URL feststeht.
- Döner-Radar-Wertungen und Instagram-Links in `src/data/shops.json` nachtragen. Koordinaten der Seed-Läden sind geschätzt und sollten geprüft werden.
- Mehr Küchen? In `types.ts` (`Cuisine`), `questions.ts`, `places.ts` (`SEARCH_TERM`, `TYPE_CUISINE`) und `order.ts` (`DISH`, `CUISINE_LABEL`) ergänzen.
