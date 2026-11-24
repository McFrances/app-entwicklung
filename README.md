# Post-Assistent

Mobile-first Web-App zum Erfassen und Verwalten von Briefen als Vorgänge.
Gebaut mit Next.js, TypeScript und Tailwind CSS.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 20.9.

```bash
npm install
cp .env.example .env.local   # danach ANTHROPIC_API_KEY in .env.local eintragen
npm run dev
```

Den API-Schlüssel bekommst du unter https://platform.claude.com/ (Bereich „API Keys“).

Dann im Browser http://localhost:3000 öffnen.

Weitere Befehle: `npm run build` (Produktions-Build), `npm start` (Build starten), `npm run lint`.
