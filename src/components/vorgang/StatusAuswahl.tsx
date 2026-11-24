"use client";

import { useState, useTransition } from "react";
import { statusAendern } from "@/app/vorgang/aktionen";
import { STATUS_TEXT, STATUS_WERTE, type Status } from "@/lib/vorgang";

export function StatusAuswahl({ vorgangId, status }: { vorgangId: string; status: Status }) {
  const [aktuell, setAktuell] = useState<Status>(status);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, starte] = useTransition();

  function waehlen(neu: Status) {
    if (neu === aktuell || laeuft) return;
    const vorher = aktuell;
    setAktuell(neu); // sofort anzeigen, bei Fehler zurücksetzen
    setFehler(null);
    starte(async () => {
      const ergebnis = await statusAendern(vorgangId, neu);
      if (!ergebnis.ok) {
        setAktuell(vorher);
        setFehler(ergebnis.fehler);
      }
    });
  }

  return (
    <div>
      <div role="group" aria-label="Status" className="grid grid-cols-3 gap-2">
        {STATUS_WERTE.map((wert) => (
          <button
            key={wert}
            type="button"
            aria-pressed={aktuell === wert}
            disabled={laeuft}
            onClick={() => waehlen(wert)}
            className={`min-h-12 rounded-xl border-2 px-2 text-base font-semibold transition active:scale-[0.98] ${
              aktuell === wert
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            }`}
          >
            {STATUS_TEXT[wert]}
          </button>
        ))}
      </div>
      {fehler && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200">
          {fehler}
        </p>
      )}
    </div>
  );
}
