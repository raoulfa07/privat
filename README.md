# Charleen & Raoul Erinnerungen

Interaktive Erinnerungsseite mit Uploads, Metadaten-Erkennung, Galerie, Timeline und realistischem Globus.

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

## Netlify-Deployment

Das Projekt ist fuer Netlify vorbereitet:

- `public/` ist das Publish-Verzeichnis.
- `netlify/functions/` enthaelt die Serverless API.
- `netlify.toml` routet `/api/memories` auf die Netlify Function.
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
