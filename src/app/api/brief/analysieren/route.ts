import Anthropic from "@anthropic-ai/sdk";
import {
  BILD_TYPEN,
  MAX_DATEIEN,
  MAX_DATEIGROESSE,
  MAX_GESAMTGROESSE,
  MAX_GROESSE_TEXT,
  PDF_TYP,
} from "@/lib/brief-analyse";
import { beispielAntwort } from "@/lib/beispiel-antwort";
import {
  AnalyseFehler,
  analysiereBrief,
  istBeispielModus,
  type BriefSeite,
} from "@/lib/claude.server";
import { leseSupabaseKonfiguration } from "@/lib/supabase/konfiguration";
import { aktuellerNutzer, erstelleServerClient } from "@/lib/supabase/server";
import { speichereVorgang, type HochgeladeneSeite } from "@/lib/vorgang-speichern.server";

// Die Analyse mehrseitiger Briefe kann eine Weile dauern.
export const maxDuration = 120;

function fehler(meldung: string, status: number) {
  return Response.json({ fehler: meldung }, { status });
}

function istBildTyp(typ: string): typ is (typeof BILD_TYPEN)[number] {
  return (BILD_TYPEN as readonly string[]).includes(typ);
}

export async function POST(request: Request) {
  // 1. Anmeldung prüfen, bevor irgendetwas Teures passiert (KI-Aufruf kostet Geld).
  if (!leseSupabaseKonfiguration()) {
    console.error("Supabase ist nicht eingerichtet (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
    return fehler("Die App ist noch nicht vollständig eingerichtet (Supabase fehlt).", 500);
  }
  const supabase = await erstelleServerClient();
  const nutzer = await aktuellerNutzer(supabase);
  if (!nutzer) return fehler("Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.", 401);

  const beispiel = istBeispielModus();
  if (!beispiel && !process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY fehlt. Bitte in .env.local eintragen.");
    return fehler("Die KI-Analyse ist noch nicht eingerichtet (API-Schlüssel fehlt).", 500);
  }

  // 2. Dateien lesen und prüfen
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fehler("Die Dateien konnten nicht gelesen werden.", 400);
  }

  const dateien = formData.getAll("seiten").filter((wert): wert is File => wert instanceof File);
  if (dateien.length === 0) return fehler("Bitte füge mindestens eine Seite hinzu.", 400);
  if (dateien.length > MAX_DATEIEN) return fehler(`Höchstens ${MAX_DATEIEN} Dateien auf einmal.`, 400);

  let gesamt = 0;
  const seiten: BriefSeite[] = [];
  const zumSpeichern: HochgeladeneSeite[] = [];
  for (const datei of dateien) {
    if (datei.size > MAX_DATEIGROESSE) {
      return fehler(`„${datei.name}“ ist zu groß (höchstens ${MAX_GROESSE_TEXT}).`, 413);
    }
    gesamt += datei.size;
    if (gesamt > MAX_GESAMTGROESSE) return fehler(`Die Dateien sind zusammen zu groß (höchstens ${MAX_GROESSE_TEXT}).`, 413);

    const bytes = Buffer.from(await datei.arrayBuffer());
    const base64 = bytes.toString("base64");
    if (datei.type === PDF_TYP) {
      seiten.push({ art: "pdf", base64 });
    } else if (istBildTyp(datei.type)) {
      seiten.push({ art: "bild", mediaType: datei.type, base64 });
    } else {
      return fehler(`„${datei.name}“ hat ein nicht unterstütztes Format. Erlaubt sind Fotos (JPG, PNG, WebP) und PDF.`, 415);
    }
    zumSpeichern.push({ name: datei.name, typ: datei.type, bytes });
  }

  // 3. Analysieren
  let analyse;
  if (beispiel) {
    // Die Dateien wurden oben wie echt geprüft; nur die KI-Antwort ist ausgedacht.
    await new Promise((fertig) => setTimeout(fertig, 1500)); // Ladeanzeige sichtbar machen
    analyse = beispielAntwort();
  } else {
    try {
      analyse = await analysiereBrief(seiten);
    } catch (error) {
      if (error instanceof AnalyseFehler) return fehler(error.message, 422);
      if (error instanceof Anthropic.RateLimitError) {
        return fehler("Gerade sind zu viele Anfragen unterwegs. Bitte versuche es gleich noch einmal.", 429);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("Anthropic-API-Schlüssel ungültig:", error.message);
        return fehler("Die KI-Analyse ist falsch eingerichtet (API-Schlüssel ungültig).", 500);
      }
      if (error instanceof Anthropic.BadRequestError) {
        console.error("Anthropic BadRequest:", error.message);
        return fehler("Die Dateien konnten nicht verarbeitet werden. Ist das Foto lesbar und die PDF nicht verschlüsselt?", 400);
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`Anthropic-Fehler ${error.status}:`, error.message);
        return fehler("Die KI ist gerade nicht erreichbar. Bitte versuche es später noch einmal.", 502);
      }
      console.error("Unerwarteter Fehler bei der Briefanalyse:", error);
      return fehler("Etwas ist schiefgelaufen. Bitte versuche es noch einmal.", 500);
    }
  }

  // 4. Jeden analysierten Brief als Vorgang speichern (Frist ist dabei noch unbestätigt)
  const { vorgangId, warnung } = await speichereVorgang({
    supabase,
    nutzerId: nutzer.id,
    analyse,
    beispiel,
    seiten: zumSpeichern,
  });

  return Response.json({ analyse, vorgangId, beispiel, warnung });
}
