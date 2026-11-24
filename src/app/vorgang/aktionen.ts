"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { STATUS_WERTE } from "@/lib/vorgang";
import { BUCKET } from "@/lib/vorgang-speichern.server";
import { aktuellerNutzer, erstelleServerClient } from "@/lib/supabase/server";

export type AktionsErgebnis = { ok: true } | { ok: false; fehler: string };

const IdSchema = z.uuid();
const NICHT_ANGEMELDET: AktionsErgebnis = {
  ok: false,
  fehler: "Du bist nicht mehr angemeldet. Bitte melde dich neu an.",
};
const NICHT_GEFUNDEN: AktionsErgebnis = { ok: false, fehler: "Der Vorgang wurde nicht gefunden." };

async function vorbereiten() {
  const supabase = await erstelleServerClient();
  const nutzer = await aktuellerNutzer(supabase);
  return nutzer ? { supabase, nutzer } : null;
}

function neuLaden(id: string) {
  revalidatePath("/");
  revalidatePath(`/vorgang/${id}`);
}

// Zugriffsschutz: Alle drei Aktionen laufen über den Client des Nutzers. Row Level Security
// in der Datenbank sorgt dafür, dass fremde Vorgänge gar nicht erst getroffen werden.

export async function statusAendern(id: string, status: string): Promise<AktionsErgebnis> {
  const eingabe = z.object({ id: IdSchema, status: z.enum(STATUS_WERTE) }).safeParse({ id, status });
  if (!eingabe.success) return { ok: false, fehler: "Ungültiger Status." };
  const kontext = await vorbereiten();
  if (!kontext) return NICHT_ANGEMELDET;

  const { data, error } = await kontext.supabase
    .from("vorgang")
    .update({ status: eingabe.data.status })
    .eq("id", eingabe.data.id)
    .select("id");
  if (error) {
    console.error("Status konnte nicht geändert werden:", error.message);
    return { ok: false, fehler: "Der Status konnte nicht gespeichert werden." };
  }
  if (data.length === 0) return NICHT_GEFUNDEN;
  neuLaden(eingabe.data.id);
  return { ok: true };
}

/** Speichert die vom Nutzer bestätigte (oder geänderte) Frist. null = keine Frist. */
export async function fristSpeichern(id: string, frist: string | null): Promise<AktionsErgebnis> {
  const eingabe = z.object({ id: IdSchema, frist: z.iso.date().nullable() }).safeParse({ id, frist });
  if (!eingabe.success) return { ok: false, fehler: "Bitte gib ein gültiges Datum ein." };
  const kontext = await vorbereiten();
  if (!kontext) return NICHT_ANGEMELDET;

  const { data, error } = await kontext.supabase
    .from("vorgang")
    .update({ frist: eingabe.data.frist, frist_bestaetigt: true })
    .eq("id", eingabe.data.id)
    .select("id");
  if (error) {
    console.error("Frist konnte nicht gespeichert werden:", error.message);
    return { ok: false, fehler: "Die Frist konnte nicht gespeichert werden." };
  }
  if (data.length === 0) return NICHT_GEFUNDEN;
  neuLaden(eingabe.data.id);
  return { ok: true };
}

/** Löscht den Vorgang samt Dokumenten, Erinnerungen und den Dateien im Storage. */
export async function vorgangLoeschen(id: string): Promise<AktionsErgebnis> {
  const eingabe = IdSchema.safeParse(id);
  if (!eingabe.success) return NICHT_GEFUNDEN;
  const kontext = await vorbereiten();
  if (!kontext) return NICHT_ANGEMELDET;
  const { supabase } = kontext;

  // Zuerst die Dateien: Datenbank-Zeilen allein würden sie im Storage verwaisen lassen.
  const { data: dokumente, error: ladeFehler } = await supabase
    .from("dokument")
    .select("speicherpfad")
    .eq("vorgang_id", eingabe.data);
  if (ladeFehler) {
    console.error("Dokumente konnten nicht geladen werden:", ladeFehler.message);
    return { ok: false, fehler: "Der Vorgang konnte nicht gelöscht werden." };
  }
  const pfade = (dokumente ?? []).map((zeile: { speicherpfad: string }) => zeile.speicherpfad);
  if (pfade.length > 0) {
    const { error: storageFehler } = await supabase.storage.from(BUCKET).remove(pfade);
    if (storageFehler) {
      console.error("Dateien konnten nicht gelöscht werden:", storageFehler.message);
      return { ok: false, fehler: "Die Dateien des Briefs konnten nicht gelöscht werden." };
    }
  }

  const { data, error } = await supabase.from("vorgang").delete().eq("id", eingabe.data).select("id");
  if (error) {
    console.error("Vorgang konnte nicht gelöscht werden:", error.message);
    return { ok: false, fehler: "Der Vorgang konnte nicht gelöscht werden." };
  }
  if (data.length === 0) return NICHT_GEFUNDEN;
  neuLaden(eingabe.data);
  return { ok: true };
}
