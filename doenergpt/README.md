# DönerGPT

5 Fragen, ein Kassenbon, ein Döner-Tipp für Münster. Kein echtes LLM, nur Scoring.

```bash
npm install
npm run dev      # lokal
npm run build    # Ausgabe in dist/
npm test
```

`VITE_LAUNCHED=true` schaltet vom „coming soon“-Teaser auf den echten Flow um (siehe `.env.example`).

Deployment: Cloudflare Pages, Root-Verzeichnis `doenergpt`, Build-Befehl `npm run build`, Ausgabe `dist`.
