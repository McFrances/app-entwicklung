import type { ReactNode } from "react";
import type { BriefAnalyse } from "@/lib/brief-analyse";
import { FristBestaetigung } from "./FristBestaetigung";
import { KeineRechtsberatung } from "./KeineRechtsberatung";

const DRINGLICHKEIT = {
  hoch: {
    text: "Dringend",
    klassen: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  },
  mittel: {
    text: "Bald erledigen",
    klassen: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  niedrig: {
    text: "Nicht dringend",
    klassen: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  },
} as const;

function Karte({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {titel}
      </h2>
      {children}
    </section>
  );
}

export function AnalyseErgebnis({ analyse }: { analyse: BriefAnalyse }) {
  const dringlichkeit = DRINGLICHKEIT[analyse.dringlichkeit];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${dringlichkeit.klassen}`}>
            {dringlichkeit.text}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {analyse.kategorie}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Absender</p>
        <p className="text-xl font-semibold break-words">{analyse.absender}</p>
      </div>

      <Karte titel="Frist">
        <FristBestaetigung vorschlag={analyse.frist} />
      </Karte>

      <Karte titel="Worum geht es?">
        <p className="text-base leading-relaxed">{analyse.zusammenfassung_einfach}</p>
        <KeineRechtsberatung />
      </Karte>

      <Karte titel="Was ist zu tun?">
        {analyse.was_ist_zu_tun.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {analyse.was_ist_zu_tun.map((schritt, index) => (
              <li key={index} className="flex gap-3 text-base leading-relaxed">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                >
                  {index + 1}
                </span>
                <span>{schritt}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-base">Laut KI musst du nichts unternehmen.</p>
        )}
        <KeineRechtsberatung />
      </Karte>

      <Karte titel="Wenn du nichts tust">
        <p className="text-base leading-relaxed">{analyse.folgen_bei_nichtstun}</p>
        <KeineRechtsberatung />
      </Karte>
    </div>
  );
}
