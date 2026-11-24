import type { BriefAnalyse } from "@/lib/brief-analyse";

export const STATUS_WERTE = ["offen", "in_arbeit", "erledigt"] as const;
export type Status = (typeof STATUS_WERTE)[number];

export const STATUS_TEXT: Record<Status, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  erledigt: "Erledigt",
};

export const STATUS_KLASSEN: Record<Status, string> = {
  offen: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  in_arbeit: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  erledigt: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
};

/** Eine Zeile der Tabelle "vorgang" (so, wie sie aus Supabase kommt). */
export type VorgangZeile = BriefAnalyse & {
  id: string;
  nutzer_id: string;
  frist_bestaetigt: boolean;
  status: Status;
  beispiel: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
};

/** Die Spalten, die die Übersicht braucht. */
export type VorgangKurz = Pick<
  VorgangZeile,
  "id" | "absender" | "kategorie" | "frist" | "frist_bestaetigt" | "dringlichkeit" | "status" | "beispiel" | "erstellt_am"
>;

export const VORGANG_KURZ_SPALTEN =
  "id, absender, kategorie, frist, frist_bestaetigt, dringlichkeit, status, beispiel, erstellt_am";

/** Eine Zeile der Tabelle "dokument". */
export type DokumentZeile = {
  id: string;
  vorgang_id: string;
  seite: number;
  speicherpfad: string;
  dateiname: string;
  mime_typ: string;
  groesse_bytes: number;
};

/** Heutiges Datum (JJJJ-MM-TT) in deutscher Zeit, damit "heute fällig" stimmt. */
export function heuteBerlin(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

const datumsformat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-12-15" → "15.12.2026" */
export function formatiereDatum(isoDatum: string): string {
  return datumsformat.format(new Date(`${isoDatum}T00:00:00Z`));
}

function tageZwischen(vonIso: string, bisIso: string): number {
  const [vj, vm, vt] = vonIso.split("-").map(Number);
  const [bj, bm, bt] = bisIso.split("-").map(Number);
  return Math.round((Date.UTC(bj, bm - 1, bt) - Date.UTC(vj, vm - 1, vt)) / 86_400_000);
}

export type FristTon = "ueberfaellig" | "bald" | "normal" | "keine";

export function fristInfo(frist: string | null, heute: string): { text: string; ton: FristTon } {
  if (!frist) return { text: "Keine Frist", ton: "keine" };
  const tage = tageZwischen(heute, frist);
  const datum = formatiereDatum(frist);
  if (tage < 0) {
    const n = -tage;
    return { text: `${datum} · seit ${n} ${n === 1 ? "Tag" : "Tagen"} überfällig`, ton: "ueberfaellig" };
  }
  if (tage === 0) return { text: `${datum} · heute fällig`, ton: "bald" };
  if (tage === 1) return { text: `${datum} · morgen fällig`, ton: "bald" };
  return { text: `${datum} · in ${tage} Tagen`, ton: tage <= 3 ? "bald" : "normal" };
}

/**
 * Sortierung für die Übersicht: nicht erledigte Vorgänge zuerst, nach nächster Frist
 * (überfällige ganz oben, ohne Frist am Ende), dann erledigte. Bei gleicher Frist
 * steht der neuere Vorgang vorn.
 */
export function sortiereVorgaenge<T extends Pick<VorgangKurz, "status" | "frist" | "erstellt_am">>(
  liste: readonly T[],
): T[] {
  return [...liste].sort((a, b) => {
    const aErledigt = a.status === "erledigt";
    const bErledigt = b.status === "erledigt";
    if (aErledigt !== bErledigt) return aErledigt ? 1 : -1;
    if (a.frist !== b.frist) {
      if (a.frist === null) return 1;
      if (b.frist === null) return -1;
      return a.frist < b.frist ? -1 : 1;
    }
    return b.erstellt_am.localeCompare(a.erstellt_am);
  });
}
