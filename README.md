# Charleen & Raoul Erinnerungen

Interaktive Erinnerungsseite mit Uploads, Metadaten-Erkennung, Galerie, Timeline, realistischem Globus und optionaler KI-Suche.

## Lokal starten

```bash
npm install
npm start
```

Die Seite laeuft dann auf:

```text
http://localhost:3000
```

Lokale Erinnerungen werden in `data/memories.json` gespeichert. Lokale Uploads liegen in `public/uploads`.

### Optionale KI-Suche

Die Suche funktioniert auch ohne KI-Key lokal ueber Titel, Orte, Daten, Tags, Notizen und Dateinamen. Wenn du Gemini aktivieren willst, setze den API-Key nur serverseitig:

```bash
GEMINI_API_KEY=dein_key npm start
```

Bei Netlify gehoert der Key in `Site configuration > Environment variables` als `GEMINI_API_KEY`. Der Key wird nicht im Browser gespeichert und nicht ins Repository eingecheckt.

## Netlify-Deployment

Das Projekt ist fuer Netlify vorbereitet:

- `public/` ist das Publish-Verzeichnis.
- `netlify/functions/` enthaelt die Serverless API.
- `netlify.toml` routet `/api/memories`, `/api/file` und `/api/ai-search` auf die Netlify Functions.
- Uploads und Erinnerungen werden auf Netlify in Netlify Blobs gespeichert.

### Deploy-Schritte

1. Projekt in ein Git-Repository pushen.
2. Bei Netlify ein neues Projekt aus dem Repository erstellen.
3. Build settings:
   - Build command: leer lassen oder `npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Deploy starten.

Netlify installiert `@netlify/blobs` aus `package.json`. Danach funktionieren API und Uploads ueber die Netlify Functions.

## Lokale Netlify-Simulation

Optional mit Netlify CLI:

```bash
npm install
npx netlify dev
```

## Hinweise

Die lokale Node-App und die Netlify-Version nutzen unterschiedliche Speicher:

- Lokal: `data/memories.json` und `public/uploads`
- Netlify: Netlify Blobs

HEIC-Bilder werden lokal auf macOS als JPEG-Vorschau konvertiert. Auf Netlify werden Dateien gespeichert und ausgeliefert; fuer HEIC-Vorschauen braucht es spaeter entweder Browser-seitige Konvertierung oder einen Bildservice.
