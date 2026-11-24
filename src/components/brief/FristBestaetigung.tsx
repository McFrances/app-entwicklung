"use client";

import { useId, useState } from "react";

const datumsformat = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatiere(isoDatum: string) {
  return datumsformat.format(new Date(`${isoDatum}T00:00:00Z`));
}

type FristBestaetigungProps = {
  vorschlag: string | null;
  onBestaetigt?: (frist: string | null) => void;
};

export function FristBestaetigung({ vorschlag, onBestaetigt }: FristBestaetigungProps) {
  const eingabeId = useId();
  const [frist, setFrist] = useState(vorschlag ?? "");
  const [bestaetigt, setBestaetigt] = useState(false);

  if (bestaetigt) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold">
          <span aria-hidden="true" className="mr-1 text-green-600">
            ✓
          </span>
          {frist ? formatiere(frist) : "Keine Frist"}
        </p>
        <button
          type="button"
          onClick={() => setBestaetigt(false)}
          className="min-h-11 rounded-xl px-4 text-base font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
        >
          Ändern
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-base text-slate-700 dark:text-slate-300">
        {vorschlag
          ? "Die KI hat diese Frist erkannt. Stimmt sie? Ändere sie sonst hier."
          : "Die KI hat keine Frist erkannt. Trage eine ein, falls der Brief doch eine nennt."}
      </p>
      <label htmlFor={eingabeId} className="mt-3 block text-sm font-medium">
        Frist
      </label>
      <input
        id={eingabeId}
        type="date"
        value={frist}
        onChange={(e) => setFrist(e.target.value)}
        className="mt-1 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-900"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setBestaetigt(true);
            onBestaetigt?.(frist || null);
          }}
          className="min-h-12 flex-1 rounded-xl bg-blue-600 px-4 text-base font-semibold text-white hover:bg-blue-700 active:bg-blue-700"
        >
          {frist ? "Frist bestätigen" : "Ohne Frist bestätigen"}
        </button>
        {frist && (
          <button
            type="button"
            onClick={() => setFrist("")}
            className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Keine Frist
          </button>
        )}
      </div>
    </div>
  );
}
