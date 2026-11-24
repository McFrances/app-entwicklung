# Post-Assistent

Mobile-first Web-App zum Erfassen und Verwalten von Briefen als Vorgänge.
Gebaut mit Next.js, TypeScript, Tailwind CSS und Supabase (Login, Datenbank, Datei-Speicher).

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 20.9 und ein Supabase-Projekt
(siehe unten, kostenlos).

```bash
npm install
cp .env.example .env.local   # danach die Werte in .env.local eintragen
npm run dev
```

Dann im Browser http://localhost:3000 öffnen. Ohne Supabase-Werte zeigt die App nur eine
Login-Seite mit dem Hinweis, was fehlt.

Weitere Befehle: `npm run build` (Produktions-Build), `npm start` (Build starten), `npm run lint`.

## Supabase einrichten

Einmalig, etwa 10 Minuten.

1. **Projekt anlegen:** Auf https://supabase.com ein Konto erstellen und „New project“ wählen.
   Bei **Region** „Central EU (Frankfurt)“ (`eu-central-1`) auswählen. Die Region lässt sich später
   nicht mehr ändern. Ein Datenbank-Passwort vergeben und sicher aufbewahren.
2. **Tabellen und Zugriffsschutz anlegen:** Im Projekt links **SQL Editor** → „New query“, den
   kompletten Inhalt von `supabase/migrations/20261124000000_init.sql` einfügen und „Run“ drücken.
   Das legt die Tabellen `vorgang`, `dokument` und `erinnerung`, den privaten Speicher-Bucket
   `dokumente` und die Regeln an, dass jeder Nutzer nur seine eigenen Daten sieht.
3. **Weiterleitungen erlauben:** **Authentication → URL Configuration**
   - **Site URL:** `http://localhost:3000` (für den späteren Betrieb: die echte Adresse der App)
   - **Redirect URLs:** `http://localhost:3000/**` hinzufügen
4. **E-Mail-Vorlage anpassen:** **Authentication → Email Templates → Magic Link**: Den Inhalt von
   `supabase/templates/magic-link.html` einfügen und speichern. Das ist wichtig fürs Handy: Der
   Link funktioniert dann auch, wenn du die E-Mail in der Mail-App öffnest und nicht im
   Browser, in dem du ihn angefordert hast. Dieselbe Vorlage bei **Confirm sign up** einfügen,
   damit sich neue Adressen genauso anmelden.
5. **Zugangsdaten eintragen:** **Project Settings → API Keys** (bzw. „API“). Kopiere die
   **Project URL** und den **Publishable key** (`sb_publishable_…`; der ältere „anon key“ geht
   auch) in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Der **service_role / secret key** wird nicht gebraucht und darf nirgends in der App stehen.
6. App neu starten, die Seite öffnen, E-Mail-Adresse eingeben und auf den Link in der E-Mail tippen.

Gut zu wissen:

- Supabases eingebauter E-Mail-Versand ist stark begrenzt (nur wenige Mails pro Stunde) und nur
  zum Ausprobieren gedacht. Für den echten Betrieb unter **Authentication → SMTP Settings** einen
  eigenen E-Mail-Dienst eintragen.
- Wer sich mit einer neuen Adresse anmeldet, bekommt automatisch ein Konto. Soll nur du die App
  nutzen, schalte unter **Authentication → Sign In / Providers** die Option „Allow new users to
  sign up“ aus, nachdem du dich einmal angemeldet hast.
- Briefe, Analysen und Fotos liegen in deinem Supabase-Projekt in Frankfurt. Die Analyse selbst
  läuft über die Claude API von Anthropic: Dafür werden die Seiten des Briefs dorthin geschickt.

## KI-Analyse (Claude API)

Ohne API-Schlüssel startet die App im **Beispielmodus**: Beim Analysieren kommt eine feste
Beispiel-Antwort statt eines echten KI-Aufrufs (die Seite weist darauf hin, und der Vorgang ist
in der Liste als „Beispiel“ markiert). So lässt sich alles ausprobieren. Sobald in `.env.local`
ein Schlüssel steht, wird die echte KI benutzt. Den Schlüssel bekommst du unter
https://platform.claude.com/ (Bereich „API Keys“).

## Zugriffsschutz testen

Die Regeln in der Datenbank lassen sich mit einer lokalen Postgres-Datenbank prüfen. Die Anleitung
steht am Anfang von `supabase/tests/rls-test.sh`.
