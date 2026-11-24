@AGENTS.md

# Post-Assistent

## Ziel

Der Post-Assistent ist eine Web-App, mit der man eingehende Briefe (Papierpost) erfasst und als
**Vorgänge** verwaltet: Was ist angekommen, von wem, was ist zu tun und bis wann? Die App soll
auf dem Handy schnell und einfach bedienbar sein, damit man einen Brief direkt beim Öffnen des
Briefkastens erfassen kann.

## Arbeitsweise

Der Nutzer arbeitet nur vom **iPad, ohne Computer**: Alles läuft über Claude im Browser, GitHub und
Vercel im Browser. Anleitungen deshalb für Anfänger, Schritt für Schritt, ohne Terminal und ohne
lokalen Entwicklungsserver. Neue Funktionen erscheinen über einen Pull Request, den der Nutzer auf
GitHub zusammenführt (Merge); danach veröffentlicht Vercel sie automatisch. Einen Pull Request nur
anlegen, wenn der Nutzer das möchte.

## Funktionen

Umgesetzt:

- Login per E-Mail-Link (Supabase Auth, ohne Passwort). Alle Seiten außer `/login` und `/auth/*`
  verlangen die Anmeldung (`src/proxy.ts`)
- Startseite (`/`): alle Vorgänge des Nutzers, sortiert nach nächster Frist (überfällige zuerst,
  ohne Frist danach), mit Status offen / in Arbeit / erledigt. Erledigte stehen eingeklappt am Ende.
- Vorgang öffnen (`/vorgang/[id]`): Status ändern, Frist bestätigen/ändern, Analyse und Seiten des
  Briefs ansehen, Vorgang löschen (samt Dateien)
- Großer, fest am unteren Rand stehender Button „Brief hinzufügen“ → `/brief/neu`
- Seite „Brief hinzufügen“ (`/brief/neu`): Fotos aufnehmen (Kamera) oder Bilder/PDF hochladen,
  mehrere Seiten, Seiten entfernen. Fotos werden im Browser auf max. 2000 px verkleinert.
- KI-Analyse über die Claude API (serverseitig): liefert `absender`, `kategorie`,
  `zusammenfassung_einfach`, `was_ist_zu_tun` (Liste), `frist` (Datum oder null),
  `folgen_bei_nichtstun`, `dringlichkeit` (niedrig/mittel/hoch)
- Jeder analysierte Brief wird sofort als Vorgang gespeichert (Frist noch unbestätigt, Dateien im
  privaten Storage-Bucket `dokumente`)
- Ergebnisansicht mit Dringlichkeit, Kategorie, Absender und Erklärungen; die Frist muss der
  Nutzer bestätigen oder ändern (wird in der Datenbank gespeichert). Unter jeder Erklärung steht der Hinweis, dass es keine
  Rechtsberatung ist.

- Beispielmodus: Ohne API-Schlüssel liefert die Analyse feste Beispiel-Antworten (3 Varianten
  reihum: Rechnung mit Frist, dringende Mahnung, Werbung ohne Frist), damit sich die ganze App
  testen lässt. Die Ergebnisseite zeigt dann den Hinweis „Beispielmodus“.

Geplant (noch nicht umgesetzt):

- Echten KI-Aufruf mit API-Schlüssel einschalten und mit echten Briefen testen
- Erinnerungen: Die Tabelle `erinnerung` samt Zugriffsschutz existiert, aber es gibt noch keine
  Oberfläche und keinen Versand (z. B. Push oder E-Mail vor Ablauf der Frist)
- Vorgänge bearbeiten (Absender, Kategorie), Suche und Filter

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
- **Supabase** (Region Frankfurt `eu-central-1`) mit `@supabase/ssr` und `@supabase/supabase-js`:
  Auth (E-Mail-Link), Postgres, Storage. Kein Prisma/ORM; Abfragen über den Supabase-Client.
  - `supabase/migrations/*.sql`: Tabellen `vorgang`, `dokument`, `erinnerung`, Bucket `dokumente`
    und alle Row-Level-Security-Regeln. Neue Änderungen am Schema kommen als **neue** Migrations-
    Datei dazu (nie die alte ändern) und müssen im SQL Editor eingespielt werden.
  - `supabase/templates/magic-link.html`: E-Mail-Vorlage (token_hash-Link, funktioniert auch im
    anderen Browser)
  - `supabase/tests/`: Test des Zugriffsschutzes gegen eine lokale Postgres-Datenbank
  - `src/lib/supabase/server.ts`: Client für Server-Code (`erstelleServerClient()`) und
    `aktuellerNutzer()`; `sitzung.ts` und `src/proxy.ts` erneuern die Sitzung und leiten auf
    `/login` um; `konfiguration.ts` liest die Umgebungsvariablen
  - `src/app/login/`: Login-Seite, Server-Aktionen `loginLinkSenden` und `abmelden`;
    `src/app/auth/confirm/route.ts` löst den Link aus der E-Mail ein
  - `src/app/vorgang/aktionen.ts`: Server-Aktionen `statusAendern`, `fristSpeichern`,
    `vorgangLoeschen`; `src/lib/vorgang-speichern.server.ts` speichert beim Analysieren
  - `src/lib/vorgang.ts`: Typen, Status-Texte, Frist-Anzeige und Sortierung
- **Vercel** (Hosting): Jeder Push auf `main` veröffentlicht automatisch, andere Zweige und Pull
  Requests bekommen Vorschau-Adressen. `vercel.json` setzt die Funktions-Region auf `fra1`
  (Frankfurt, nah an Supabase). Die Umgebungsvariablen stehen in Vercel unter Settings →
  Environment Variables (nicht im Repository). Der Login-Link der E-Mail führt immer zur
  Site URL aus Supabase, also zur Hauptadresse. Die Anleitung steht in der README.
- **Upload-Grenze 4 MB** für alle Seiten eines Briefs zusammen (`MAX_GESAMTGROESSE` in
  `src/lib/brief-analyse.ts`), weil Vercel pro Anfrage nur 4,5 MB annimmt. Fotos verkleinert
  `src/components/brief/bild-verkleinern.ts` stufenweise automatisch; PDFs nicht. Der Server prüft
  die Grenze zusätzlich. Wer größere Briefe braucht: Dateien direkt vom Browser in den
  Supabase-Storage hochladen und den Server nur die Pfade schicken.
- Wiederverwendbare Komponenten liegen in `src/components/`, z. B. `Vorgangsliste.tsx`,
  `VorgangsUebersicht.tsx` (lädt die Daten) und `vorgang/` (Status, Löschen)

Umgebungsvariablen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (öffentlich,
der Schutz kommt von RLS; der geheime `service_role`-Schlüssel wird nie gebraucht und darf nicht in
die App), `ANTHROPIC_API_KEY`.

API-Schlüssel: `ANTHROPIC_API_KEY` in Vercel (lokal: `.env.local`, Vorlage: `.env.example`). Der Schlüssel darf
nie im Browser landen: kein `NEXT_PUBLIC_`-Präfix, Claude nur aus Server-Code aufrufen.
Beispielmodus: `KI_MODUS=beispiel` (immer an) oder `KI_MODUS=echt` (immer aus). Ohne Angabe ist er nur
bei `npm run dev` ohne API-Schlüssel an; ein Produktions-Build (auch auf Vercel) ohne Schlüssel meldet
einen Fehler, damit nie versehentlich Beispieldaten als echte Analyse erscheinen. Auf Vercel gilt
deshalb `KI_MODUS=beispiel`, solange es noch keinen `ANTHROPIC_API_KEY` gibt.

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
- **Zugriffsschutz:** Jede neue Tabelle bekommt `nutzer_id uuid default auth.uid()`, aktiviertes
  Row Level Security und Regeln pro Befehl (`for select/insert/update/delete to authenticated`
  mit `(select auth.uid()) = nutzer_id`). `anon` bekommt nichts. Nach Änderungen
  `supabase/tests/rls-test.sh` erweitern und laufen lassen. In der App immer den Client des
  Nutzers (`erstelleServerClient()`) benutzen, nie einen Admin-Client, damit RLS greift.
- **Cache Components:** Alles, was Cookies/Anmeldung oder die aktuelle Uhrzeit braucht, läuft in einer
  Komponente hinter `<Suspense>` und beginnt mit `await connection()` (aus `next/server`). Sonst bricht
  der Build ab oder die Seite zeigt Fehler.
- Vor dem Committen `npm run lint` und `npm run build` ausführen.
