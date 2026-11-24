import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BriefAnalyse } from "@/lib/brief-analyse";

export type HochgeladeneSeite = {
  name: string;
  typ: string;
  bytes: Buffer;
};

const ENDUNG: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export const BUCKET = "dokumente";

/**
 * Speichert einen analysierten Brief als Vorgang und legt die Seiten im Storage ab.
 * Wirft nie: Schlägt etwas fehl, bekommt der Nutzer trotzdem seine Analyse und eine Warnung.
 */
export async function speichereVorgang(args: {
  supabase: SupabaseClient;
  nutzerId: string;
  analyse: BriefAnalyse;
  beispiel: boolean;
  seiten: HochgeladeneSeite[];
}): Promise<{ vorgangId: string | null; warnung?: string }> {
  const { supabase, nutzerId, analyse, beispiel, seiten } = args;

  try {
    const { data: vorgang, error } = await supabase
      .from("vorgang")
      .insert({
        absender: analyse.absender,
        kategorie: analyse.kategorie,
        zusammenfassung_einfach: analyse.zusammenfassung_einfach,
        was_ist_zu_tun: analyse.was_ist_zu_tun,
        frist: analyse.frist,
        folgen_bei_nichtstun: analyse.folgen_bei_nichtstun,
        dringlichkeit: analyse.dringlichkeit,
        beispiel,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !vorgang) {
      console.error("Vorgang konnte nicht gespeichert werden:", error?.message);
      return {
        vorgangId: null,
        warnung: "Die Analyse ist fertig, konnte aber nicht gespeichert werden. Mach am besten einen Screenshot.",
      };
    }

    // Seiten parallel hochladen. Pfad: <nutzer_id>/<vorgang_id>/<seite>.<endung>
    const ergebnisse = await Promise.all(
      seiten.map(async (seite, index) => {
        const nummer = index + 1;
        const pfad = `${nutzerId}/${vorgang.id}/${nummer}.${ENDUNG[seite.typ] ?? "bin"}`;
        const { error: uploadFehler } = await supabase.storage
          .from(BUCKET)
          .upload(pfad, seite.bytes, { contentType: seite.typ, upsert: false });
        if (uploadFehler) {
          console.error(`Upload von Seite ${nummer} fehlgeschlagen:`, uploadFehler.message);
          return null;
        }
        return {
          vorgang_id: vorgang.id,
          seite: nummer,
          speicherpfad: pfad,
          dateiname: seite.name.slice(0, 200),
          mime_typ: seite.typ,
          groesse_bytes: seite.bytes.length,
        };
      }),
    );
    const hochgeladen = ergebnisse.filter((zeile) => zeile !== null);

    let warnung: string | undefined;
    if (hochgeladen.length > 0) {
      const { error: dokumentFehler } = await supabase.from("dokument").insert(hochgeladen);
      if (dokumentFehler) {
        console.error("Dokumente konnten nicht eingetragen werden:", dokumentFehler.message);
        warnung = "Der Vorgang ist gespeichert, aber die Seiten des Briefs konnten nicht abgelegt werden.";
      }
    }
    if (!warnung && hochgeladen.length < seiten.length) {
      warnung = "Der Vorgang ist gespeichert, aber nicht alle Seiten des Briefs konnten abgelegt werden.";
    }
    return { vorgangId: vorgang.id, warnung };
  } catch (error) {
    console.error("Unerwarteter Fehler beim Speichern:", error);
    return { vorgangId: null, warnung: "Die Analyse ist fertig, konnte aber nicht gespeichert werden." };
  }
}
