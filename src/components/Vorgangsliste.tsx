export type Vorgang = {
  id: string;
  titel: string;
  absender: string;
  eingangsdatum: string; // ISO-Datum, z. B. "2026-11-24"
};

type VorgangslisteProps = {
  vorgaenge: Vorgang[];
};

const datumsformat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function Vorgangsliste({ vorgaenge }: VorgangslisteProps) {
  if (vorgaenge.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
        <span aria-hidden="true" className="text-5xl">
          ✉️
        </span>
        <p className="mt-4 text-lg font-medium">Noch keine Vorgänge</p>
        <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
          Tippe auf „Brief hinzufügen“, um deinen ersten Brief zu erfassen.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {vorgaenge.map((vorgang) => (
        <li
          key={vorgang.id}
          className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800"
        >
          <p className="text-lg font-medium">{vorgang.titel}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {vorgang.absender} ·{" "}
            {datumsformat.format(new Date(vorgang.eingangsdatum))}
          </p>
        </li>
      ))}
    </ul>
  );
}
