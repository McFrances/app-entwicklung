import Anthropic from "@anthropic-ai/sdk";
import {
  BILD_TYPEN,
  MAX_DATEIEN,
  MAX_DATEIGROESSE,
  MAX_GESAMTGROESSE,
  PDF_TYP,
} from "@/lib/brief-analyse";
import { AnalyseFehler, analysiereBrief, type BriefSeite } from "@/lib/claude.server";

// Die Analyse mehrseitiger Briefe kann eine Weile dauern.
export const maxDuration = 120;

function fehler(meldung: string, status: number) {
  return Response.json({ fehler: meldung }, { status });
}

function istBildTyp(typ: string): typ is (typeof BILD_TYPEN)[number] {
  return (BILD_TYPEN as readonly string[]).includes(typ);
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY fehlt. Bitte in .env.local eintragen.");
    return fehler("Die KI-Analyse ist noch nicht eingerichtet (API-Schlüssel fehlt).", 500);
  }

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
  for (const datei of dateien) {
    if (datei.size > MAX_DATEIGROESSE) {
      return fehler(`„${datei.name}“ ist zu groß (höchstens 10 MB je Datei).`, 413);
    }
    gesamt += datei.size;
    if (gesamt > MAX_GESAMTGROESSE) return fehler("Die Dateien sind zusammen zu groß (höchstens 25 MB).", 413);

    const base64 = Buffer.from(await datei.arrayBuffer()).toString("base64");
    if (datei.type === PDF_TYP) {
      seiten.push({ art: "pdf", base64 });
    } else if (istBildTyp(datei.type)) {
      seiten.push({ art: "bild", mediaType: datei.type, base64 });
    } else {
      return fehler(`„${datei.name}“ hat ein nicht unterstütztes Format. Erlaubt sind Fotos (JPG, PNG, WebP) und PDF.`, 415);
    }
  }

  try {
    const analyse = await analysiereBrief(seiten);
    return Response.json({ analyse });
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
