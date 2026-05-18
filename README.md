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

Bei Cloudflare gehoert der Key in `Workers & Pages > dein Projekt > Settings > Variables and Secrets` als verschluesseltes Secret `GEMINI_API_KEY`.

## Cloudflare Pages Deployment

Das Projekt ist auch fuer Cloudflare Pages vorbereitet:

- `public/` ist das Ausgabeverzeichnis.
- `functions/api/` enthaelt die Cloudflare Pages Functions fuer `/api/memories`, `/api/file` und `/api/ai-search`.
- Erinnerungsdaten werden in KV gespeichert.
- Bilder und Vorschauen werden in R2 gespeichert.

### Cloudflare Bindings

Damit Uploads und Loeschen funktionieren, muessen im Cloudflare Pages Projekt diese Bindings angelegt sein:

1. KV Namespace erstellen, z. B. `charleen_raoul_memories`
2. R2 Bucket erstellen, z. B. `charleen-raoul-files`
3. Im Pages Projekt unter `Settings > Functions > Bindings` verbinden:
   - KV Namespace Binding name: `MEMORY_DATA`
   - R2 Bucket Binding name: `MEMORY_FILES`
4. Optional unter `Settings > Variables and Secrets`:
   - Secret: `GEMINI_API_KEY`

Ohne diese Bindings kann Cloudflare zwar die statische Seite anzeigen, aber neue Erinnerungen koennen nicht gespeichert werden.

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

### Cloudflare 404 bei `/api/*`

Wenn `/api/health` oder `/api/memories` auf Cloudflare 404 liefert, werden die Pages Functions nicht deployed. Pruefe dann im Cloudflare Pages Projekt:

- Git repository: dieses Repository.
- Root directory: leer lassen, nicht `public`.
- Build command: leer lassen oder `npm install`.
- Build output directory: `public`.
- Functions directory muss im Repositoryroot `functions` liegen.
- Der Ordner `functions/` muss im letzten Deploy-Log auftauchen.

Die Datei `wrangler.toml` setzt `pages_build_output_dir = "public"` fuer Cloudflare Pages. Die Binding-IDs in `wrangler.toml` sind Platzhalter; in der Cloudflare UI muessen die Bindings trotzdem exakt `MEMORY_DATA` und `MEMORY_FILES` heissen.

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
