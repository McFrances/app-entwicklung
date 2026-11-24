@AGENTS.md

# Post-Assistent

## Ziel

Der Post-Assistent ist eine Web-App, mit der man eingehende Briefe (Papierpost) erfasst und als
**Vorgänge** verwaltet: Was ist angekommen, von wem, was ist zu tun und bis wann? Die App soll
auf dem Handy schnell und einfach bedienbar sein, damit man einen Brief direkt beim Öffnen des
Briefkastens erfassen kann.

## Funktionen

Umgesetzt:

- Startseite mit der Vorgangsliste (zurzeit immer leer, noch keine Datenquelle) und einem
  Hinweis, solange keine Vorgänge vorhanden sind
- Großer, fest am unteren Rand stehender Button „Brief hinzufügen“ → `/brief/neu`
- Seite „Brief hinzufügen“ (`/brief/neu`): Fotos aufnehmen (Kamera) oder Bilder/PDF hochladen,
  mehrere Seiten, Seiten entfernen. Fotos werden im Browser auf max. 2000 px verkleinert.
- KI-Analyse über die Claude API (serverseitig): liefert `absender`, `kategorie`,
  `zusammenfassung_einfach`, `was_ist_zu_tun` (Liste), `frist` (Datum oder null),
  `folgen_bei_nichtstun`, `dringlichkeit` (niedrig/mittel/hoch)
- Ergebnisansicht mit Dringlichkeit, Kategorie, Absender und Erklärungen; die Frist muss der
  Nutzer bestätigen oder ändern. Unter jeder Erklärung steht der Hinweis, dass es keine
  Rechtsberatung ist.

- Beispielmodus: Ohne API-Schlüssel liefert die Analyse feste Beispiel-Antworten (3 Varianten
  reihum: Rechnung mit Frist, dringende Mahnung, Werbung ohne Frist), damit sich die ganze App
  testen lässt. Die Ergebnisseite zeigt dann den Hinweis „Beispielmodus“.

Geplant (noch nicht umgesetzt):

- Echten KI-Aufruf mit API-Schlüssel einschalten und mit echten Briefen testen
- Analysierte Briefe als Vorgänge speichern (inkl. bestätigter Frist) und in der Liste anzeigen
- Vorgang öffnen, bearbeiten und als erledigt markieren
- Fristen und Erinnerungen

## Technik

- **Next.js 16** mit App Router (`src/app/`), Cache Components aktiviert (`next.config.ts`)
- **TypeScript** (strict), Import-Alias `@/*` → `src/*`
- **Tailwind CSS 4** (Konfiguration in `src/app/globals.css` über `@theme`, keine
  `tailwind.config`-Datei)
- ESLint mit `eslint-config-next`
- **Claude API** über das offizielle SDK `@anthropic-ai/sdk`, Modell `claude-opus-5-5`,
  Structured Outputs mit Zod (`betaZodOutputFormat`), serverseitiger Fallback bei Ablehnungen
  (`fallbacks: "default"`)
  - `src/lib/brief-analyse.ts`: Zod-Schema der Antwort, erlaubte Dateitypen, Größenlimits
    (gemeinsam für Browser und Server)
  - `src/lib/claude.server.ts`: Prompt und API-Aufruf, nur auf dem Server (`server-only`);
    `istBeispielModus()` entscheidet, ob statt Claude die Beispiel-Antwort kommt
  - `src/lib/beispiel-antwort.ts`: die Beispiel-Antworten (gleiche Form wie die echte Antwort)
  - `src/app/api/brief/analysieren/route.ts`: Route Handler, nimmt `FormData` (Feld `seiten`)
    entgegen, prüft Typ und Größe, gibt `{ analyse }` oder `{ fehler }` zurück
  - Komponenten der Seite in `src/components/brief/`
- Wiederverwendbare Komponenten liegen in `src/components/`, z. B. `Vorgangsliste.tsx`
  (enthält auch den Typ `Vorgang`)

API-Schlüssel: `ANTHROPIC_API_KEY` in `.env.local` (Vorlage: `.env.example`). Der Schlüssel darf
nie im Browser landen: kein `NEXT_PUBLIC_`-Präfix, Claude nur aus Server-Code aufrufen.
Beispielmodus: `KI_MODUS=beispiel` (immer an) oder `KI_MODUS=echt` (immer aus). Ohne Angabe ist er nur
bei `npm run dev` ohne API-Schlüssel an; ein Produktions-Build ohne Schlüssel meldet einen Fehler,
damit nie versehentlich Beispieldaten als echte Analyse erscheinen.

Befehle:

- `npm install` – Abhängigkeiten installieren
- `npm run dev` – Entwicklungsserver auf http://localhost:3000
- `npm run build` – Produktions-Build (prüft auch die Typen)
- `npm run lint` – ESLint

## Regeln für die Entwicklung

- **Sprache:** Die gesamte Oberfläche ist auf Deutsch (`<html lang="de">`). Datumsangaben im
  deutschen Format (TT.MM.JJJJ, z. B. über `Intl.DateTimeFormat("de-DE")`). Fachliche Namen im
  Code ebenfalls auf Deutsch (z. B. `Vorgang`, `vorgaenge`), technische Begriffe dürfen englisch
  bleiben.
- **Mobile first:** Zuerst für schmale Bildschirme (ab 320 px Breite) gestalten, größere
  Bildschirme mit Tailwind-Breakpoints (`sm:`, `md:` …) ergänzen. Inhalt höchstens `max-w-xl`
  breit.
- **Gut bedienbar mit dem Daumen:** Tipp-Flächen mindestens 44 × 44 px (Haupt-Buttons `min-h-14`),
  wichtige Aktionen unten im Bildschirm, Schrift mindestens `text-base` (16 px, verhindert das
  automatische Zoomen auf iOS bei Eingabefeldern).
- Sichere Bereiche von Geräten mit Notch berücksichtigen (`env(safe-area-inset-*)`,
  `viewportFit: "cover"` ist gesetzt).
- Hell- und Dunkelmodus unterstützen (`dark:`-Klassen, Farben in `globals.css`).
- KI-Erklärungen immer mit dem Hinweis „keine Rechtsberatung“ (`KeineRechtsberatung`) anzeigen.
  Von der KI erkannte Fristen nie ungeprüft übernehmen, sondern vom Nutzer bestätigen lassen.
- Vor dem Committen `npm run lint` und `npm run build` ausführen.
