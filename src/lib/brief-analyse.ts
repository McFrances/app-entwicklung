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

/** Obergrenzen, die Browser und Server gleichermaßen prüfen. */
export const MAX_DATEIEN = 10;
export const MAX_DATEIGROESSE = 10 * 1024 * 1024; // 10 MB je Datei
export const MAX_GESAMTGROESSE = 25 * 1024 * 1024; // 25 MB insgesamt
