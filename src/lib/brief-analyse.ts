import { z } from "zod";

/** Schema der KI-Antwort. Wird für Structured Outputs und zur Prüfung im Browser genutzt. */
export const BriefAnalyseSchema = z.object({
  absender: z
    .string()
    .describe("Name der Behörde, Firma oder Person, die den Brief geschickt hat"),
  kategorie: z
    .string()
    .describe(
      "Kurze Kategorie auf Deutsch, z. B. Rechnung, Mahnung, Steuer, Versicherung, Bank, Behörde, Vertrag, Werbung, Sonstiges",
    ),
  zusammenfassung_einfach: z
    .string()
    .describe("Worum es im Brief geht, in einfacher Sprache, 2–4 kurze Sätze"),
  was_ist_zu_tun: z
    .array(z.string())
    .describe("Konkrete Schritte, die der Empfänger erledigen sollte; leer, wenn nichts zu tun ist"),
  frist: z
    .iso.date()
    .nullable()
    .describe("Wichtigste Frist als Datum (JJJJ-MM-TT) oder null, wenn keine Frist erkennbar ist"),
  folgen_bei_nichtstun: z
    .string()
    .describe("Was voraussichtlich passiert, wenn der Empfänger nichts unternimmt"),
  dringlichkeit: z.enum(["niedrig", "mittel", "hoch"]),
});

export type BriefAnalyse = z.infer<typeof BriefAnalyseSchema>;

/** Erlaubte Dateitypen für den Upload. */
export const BILD_TYPEN = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const PDF_TYP = "application/pdf";

/**
 * Obergrenzen, die Browser und Server gleichermaßen prüfen.
 * Vercel nimmt pro Anfrage höchstens 4,5 MB entgegen. 4 MB lassen Platz für den Rahmen
 * der Anfrage. Fotos verkleinert die App bei Bedarf automatisch, PDFs nicht.
 */
export const MAX_DATEIEN = 10;
export const MAX_GESAMTGROESSE = 4 * 1024 * 1024; // 4 MB für alle Seiten zusammen
export const MAX_DATEIGROESSE = MAX_GESAMTGROESSE; // eine einzelne Datei darf also höchstens alles belegen
export const MAX_GROESSE_TEXT = "4 MB";
