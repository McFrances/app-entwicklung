import "server-only";

import type { BriefAnalyse } from "@/lib/brief-analyse";

/**
 * Beispiel-Antworten für den Test ohne API-Schlüssel.
 * Sie haben dieselbe Form wie die echte KI-Antwort (BriefAnalyseSchema).
 * Drei Varianten, damit sich alle Anzeigen testen lassen: Frist vorhanden,
 * dringend mit Folgen, und ganz ohne Frist.
 */

function datumIn(tage: number): string {
  const datum = new Date();
  datum.setUTCDate(datum.getUTCDate() + tage);
  return datum.toISOString().slice(0, 10);
}

function deutsch(iso: string): string {
  const [jahr, monat, tag] = iso.split("-");
  return `${tag}.${monat}.${jahr}`;
}

const varianten: Array<() => BriefAnalyse> = [
  () => {
    const frist = datumIn(21);
    return {
      absender: "Stadtwerke Musterstadt GmbH",
      kategorie: "Rechnung",
      zusammenfassung_einfach:
        "Die Stadtwerke schicken dir die Jahresabrechnung für Strom. Du hast mehr verbraucht, als du vorausbezahlt hast. Deshalb musst du 182,40 € nachzahlen.",
      was_ist_zu_tun: [
        "Prüfe, ob der Zählerstand auf Seite 2 stimmt.",
        `Überweise 182,40 € bis zum ${deutsch(frist)} an die angegebene IBAN.`,
        "Merke dir den neuen Abschlag: ab dem nächsten Monat 78 € pro Monat.",
      ],
      frist,
      folgen_bei_nichtstun:
        "Du bekommst eine Mahnung mit zusätzlichen Gebühren. Später kann der Anbieter sogar mit einer Stromsperre drohen.",
      dringlichkeit: "mittel",
    };
  },
  () => {
    const frist = datumIn(5);
    return {
      absender: "Inkasso Rhein GmbH",
      kategorie: "Mahnung",
      zusammenfassung_einfach:
        "Eine Inkasso-Firma sagt, dass eine Rechnung über 89,90 € noch nicht bezahlt wurde. Sie verlangt das Geld plus 40 € Gebühren. Prüfe zuerst, ob die Forderung überhaupt stimmt.",
      was_ist_zu_tun: [
        "Suche die ursprüngliche Rechnung heraus und prüfe, ob du sie schon bezahlt hast.",
        "Wenn die Forderung stimmt: Überweise den Betrag von 129,90 € mit dem angegebenen Aktenzeichen.",
        "Wenn sie nicht stimmt oder du unsicher bist: Lass dich bei der Verbraucherzentrale beraten, bevor du zahlst oder antwortest.",
      ],
      frist,
      folgen_bei_nichtstun:
        "Die Firma kann weitere Gebühren verlangen und im nächsten Schritt einen gerichtlichen Mahnbescheid beantragen.",
      dringlichkeit: "hoch",
    };
  },
  () => ({
    absender: "Möbelhaus Wohnwelt",
    kategorie: "Werbung",
    zusammenfassung_einfach:
      "Das Möbelhaus wirbt für einen Sommerschlussverkauf mit Rabatten auf Sofas und Betten. Du musst nichts tun.",
    was_ist_zu_tun: [],
    frist: null,
    folgen_bei_nichtstun: "Nichts. Du verpasst höchstens die Rabatte.",
    dringlichkeit: "niedrig",
  }),
];

let naechste = 0;

/** Liefert reihum eine der Beispiel-Antworten. */
export function beispielAntwort(): BriefAnalyse {
  const antwort = varianten[naechste % varianten.length]();
  naechste += 1;
  return antwort;
}
