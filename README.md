# Post-Assistent

Mobile-first Web-App zum Erfassen und Verwalten von Briefen als Vorgänge.
Gebaut mit Next.js, TypeScript, Tailwind CSS und Supabase (Login, Datenbank, Datei-Speicher),
veröffentlicht über Vercel.

**So hängt alles zusammen:**

- **GitHub** speichert den Code.
- **Vercel** baut aus dem Code die App und stellt sie unter einer Internetadresse bereit. Jede
  Änderung auf GitHub erscheint dort automatisch.
- **Supabase** speichert Logins, Vorgänge und Fotos (Region Frankfurt).
- **Claude (Anthropic)** liest die Briefe.

Alles lässt sich im Browser erledigen, auch auf dem iPad. Ein Computer ist nicht nötig.

---

## 1. Supabase einrichten (einmalig)

1. **Projekt anlegen:** Auf https://supabase.com ein Konto erstellen und „New project“ wählen.
   Bei **Region** „Central EU (Frankfurt)“ (`eu-central-1`) auswählen. Die Region lässt sich später
   nicht mehr ändern. Ein Datenbank-Passwort vergeben und sicher aufbewahren.
2. **Tabellen und Zugriffsschutz anlegen:** Im Projekt links **SQL Editor** → „New query“, den
   kompletten Inhalt von `supabase/migrations/20261124000000_init.sql` (hier auf GitHub öffnen,
   „Raw“ antippen, alles kopieren) einfügen und „Run“ drücken. Das legt die Tabellen `vorgang`,
   `dokument` und `erinnerung`, den privaten Speicher `dokumente` und die Regeln an, dass jeder
   Nutzer nur seine eigenen Daten sieht.
3. **E-Mail-Vorlage anpassen:** **Authentication → Email Templates → Magic Link**: Den Inhalt von
   `supabase/templates/magic-link.html` einfügen und speichern. Das ist fürs Handy und iPad
   wichtig: Der Link funktioniert dann auch, wenn du die E-Mail in der Mail-App öffnest und nicht
   im Browser, in dem du ihn angefordert hast. Dieselbe Vorlage auch bei **Confirm sign up**
   einfügen, damit sich neue Adressen genauso anmelden.
4. **Die Adresse der App eintragen** (Site URL und Redirect URLs): Das geht erst, wenn die App auf
   Vercel läuft. Siehe unten, Schritt 3 der Vercel-Anleitung.
5. **Zugangsdaten notieren:** **Project Settings** (Zahnrad) → **API Keys** bzw. **API**. Du brauchst
   die **Project URL** (`https://<projekt>.supabase.co`) und den **Publishable key**
   (`sb_publishable_…`; der ältere „anon key“ geht auch). Der geheime „service_role / secret key“
   wird nicht gebraucht und darf nirgends in der App stehen.

Gut zu wissen:

- Supabases eingebauter E-Mail-Versand ist stark begrenzt (nur wenige Mails pro Stunde) und nur
  zum Ausprobieren gedacht. Für den echten Betrieb unter **Authentication → SMTP Settings** einen
  eigenen E-Mail-Dienst eintragen.
- Wer sich mit einer neuen Adresse anmeldet, bekommt automatisch ein Konto. Soll nur du die App
  nutzen, schalte unter **Authentication → Sign In / Providers** die Option „Allow new users to
  sign up“ aus, nachdem du dich einmal angemeldet hast.
- Briefe, Analysen und Fotos liegen in deinem Supabase-Projekt in Frankfurt. Die Analyse selbst
  läuft über die Claude API von Anthropic: Dafür werden die Seiten des Briefs dorthin geschickt.

---

## 2. Auf Vercel veröffentlichen

Einmalig, etwa 15 Minuten. Die Beschriftungen auf den Webseiten können sich leicht ändern, der
Ablauf bleibt gleich.

### Schritt 0: App auf den Hauptzweig (`main`) bringen

Vercel veröffentlicht den Zweig `main`. Solange die App nur auf einem Arbeitszweig (z. B.
`claude/…`) liegt, gibt es auf `main` nichts zu bauen. Auf GitHub im Repository oben
„Compare & pull request“ bzw. unter „Pull requests“ den offenen Pull Request öffnen und
**Merge pull request** → **Confirm merge** antippen.

### Schritt 1: Vercel mit GitHub verbinden

1. https://vercel.com öffnen → **Sign Up** → Plan **Hobby** (für Privates) → **Continue with
   GitHub** und bei GitHub mit **Authorize Vercel** zustimmen.
2. Im Vercel-Dashboard **Add New…** → **Project**.
3. Unter **Import Git Repository** das Repository `app-entwicklung` suchen und **Import** antippen.
   Steht es nicht in der Liste: **Adjust GitHub App Permissions** antippen. GitHub öffnet sich;
   bei „Repository access“ **Only select repositories** wählen, `app-entwicklung` auswählen und
   **Save**. Zurück bei Vercel erscheint das Repository.
4. Auf der Seite **Configure Project** nichts ändern: Framework Preset ist **Next.js**,
   Root Directory bleibt `./`. Den Projektnamen kannst du anpassen (z. B. `post-assistent`); er
   wird Teil der Adresse. **Noch nicht auf Deploy tippen.** Erst Schritt 2.

### Schritt 2: Supabase-Werte als Environment Variables eintragen

Auf der Seite **Configure Project** den Bereich **Environment Variables** aufklappen. Pro Zeile
den Namen (Key) und den Wert (Value) eintragen und **Add** antippen:

| Name (Key)                             | Wert                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | die **Project URL** aus Supabase (`https://….supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | der **Publishable key** aus Supabase (`sb_publishable_…`)  |
| `KI_MODUS`                             | `beispiel` (solange du noch keinen Claude-Schlüssel hast)  |

Dann **Deploy** antippen und 1 bis 2 Minuten warten, bis „Congratulations!“ erscheint. Tippe auf
**Continue to Dashboard**. Dort steht die Adresse deiner App, z. B.
`https://post-assistent.vercel.app`. Genau diese Adresse brauchst du im nächsten Schritt.

Später ändern oder ergänzen: Im Vercel-Projekt **Settings → Environment Variables**. Änderungen
gelten erst für neue Deployments. Danach **Deployments** → oberstes Deployment → **⋯** →
**Redeploy** antippen.

Wenn du einen Claude-Schlüssel hast (https://platform.claude.com/, „API Keys“): Variable
`ANTHROPIC_API_KEY` mit dem Schlüssel anlegen (Schalter „Sensitive“ einschalten), `KI_MODUS`
löschen und neu deployen. Dann liest die echte KI deine Briefe.

### Schritt 3: Die Vercel-Adresse in Supabase eintragen

Ohne diesen Schritt führt der Link in der Login-E-Mail ins Leere.

1. In Supabase dein Projekt öffnen → **Authentication** → **URL Configuration**.
2. **Site URL:** die Vercel-Adresse eintragen, genau so, wie sie im Vercel-Dashboard steht, ohne
   „/“ am Ende (z. B. `https://post-assistent.vercel.app`) → **Save changes**.
3. **Redirect URLs** → **Add URL** → dieselbe Adresse mit `/**` am Ende eintragen
   (z. B. `https://post-assistent.vercel.app/**`) → **Save changes**.

### Schritt 4: Ausprobieren

Die Vercel-Adresse öffnen, E-Mail-Adresse eingeben, **Login-Link senden**, in der E-Mail auf den
Link tippen. Danach siehst du die Übersicht. Tipp: Über das Teilen-Symbol von Safari → „Zum
Home-Bildschirm“ legst du die App wie eine App auf dein iPad.

---

## 3. Änderungen erscheinen automatisch

Vercel beobachtet das GitHub-Repository:

- **Änderung landet auf `main`** (z. B. nach „Merge pull request“): Vercel baut die App neu und
  veröffentlicht sie unter deiner Hauptadresse, nach etwa 1 bis 2 Minuten. Dafür ist nichts weiter
  zu tun.
- **Änderung auf einem anderen Zweig oder in einem Pull Request:** Vercel baut eine **Vorschau**
  unter einer eigenen, vorläufigen Adresse (im Pull Request auf GitHub als Eintrag „Vercel“ zu
  sehen, auch im Vercel-Dashboard unter **Deployments**). Die Hauptadresse bleibt unverändert.
  Zum Anmelden nutze die Hauptadresse, denn der Login-Link führt immer dorthin.
- Schlägt ein Bau fehl, bleibt die letzte funktionierende Version online. Den Fehler findest du
  unter **Deployments** → das rote Deployment → **Build Logs**.

Üblicher Ablauf: Claude ändert etwas und legt einen Pull Request an → du tippst auf GitHub
**Merge pull request** → kurz darauf ist die Änderung auf deiner Adresse.

---

## 4. Häufige Probleme

| Problem | Lösung |
| ------- | ------ |
| „Supabase ist noch nicht eingerichtet“ auf der Login-Seite | Environment Variables fehlen oder sind falsch geschrieben. Prüfen, dann **Redeploy**. |
| Login-Link führt auf eine Fehlerseite oder „ungültig oder abgelaufen“ | Site URL und Redirect URL in Supabase prüfen (Schritt 3), E-Mail-Vorlage prüfen. Links gelten nur einmal und nur kurz. |
| „Zu viele Anfragen“ beim Login | Supabase begrenzt E-Mails. Eine Minute warten oder einen eigenen E-Mail-Dienst eintragen. |
| „Die KI-Analyse ist noch nicht eingerichtet“ | Weder `ANTHROPIC_API_KEY` noch `KI_MODUS=beispiel` ist gesetzt. Eins davon eintragen, **Redeploy**. |
| „Die Seiten sind zusammen zu groß“ | Vercel erlaubt pro Anfrage etwa 4,5 MB. Die App verkleinert Fotos selbst bis 4 MB. Große PDFs oder zu viele Seiten: weniger Seiten oder Fotos statt PDF. |
| Der Bau auf Vercel schlägt mit einer Meldung zu `maxDuration` fehl | Im Projekt unter **Settings → Functions** die Option „Fluid Compute“ einschalten oder in `src/app/api/brief/analysieren/route.ts` den Wert `maxDuration` auf 60 senken. |

---

## Lokal entwickeln (nur mit Computer, optional)

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 20.9.

```bash
npm install
cp .env.example .env.local   # danach die Werte in .env.local eintragen
npm run dev
```

Dann http://localhost:3000 öffnen. Für den Login auf dem Computer in Supabase zusätzlich
`http://localhost:3000/**` bei den Redirect URLs eintragen und die Site URL vorübergehend auf
`http://localhost:3000` setzen. Weitere Befehle: `npm run build`, `npm start`, `npm run lint`.

## KI-Analyse (Claude API)

Ohne API-Schlüssel startet die App lokal im **Beispielmodus**: Beim Analysieren kommt eine feste
Beispiel-Antwort statt eines echten KI-Aufrufs (die Seite weist darauf hin, und der Vorgang ist
in der Liste als „Beispiel“ markiert). Auf Vercel muss der Beispielmodus ausdrücklich mit
`KI_MODUS=beispiel` eingeschaltet werden; ohne Schlüssel und ohne diese Variable meldet die App
einen Fehler, damit nie versehentlich Beispieldaten als echte Analyse erscheinen.

## Zugriffsschutz testen

Die Regeln in der Datenbank lassen sich mit einer lokalen Postgres-Datenbank prüfen. Die Anleitung
steht am Anfang von `supabase/tests/rls-test.sh`.
