import Link from "next/link";
import { fristInfo, type FristTon, type VorgangKurz } from "@/lib/vorgang";
import { StatusBadge } from "./StatusBadge";

const FRIST_KLASSEN: Record<FristTon, string> = {
  ueberfaellig: "font-semibold text-red-700 dark:text-red-400",
  bald: "font-semibold text-amber-700 dark:text-amber-400",
  normal: "text-slate-700 dark:text-slate-300",
  keine: "text-slate-500 dark:text-slate-400",
};

const DRINGLICHKEIT_PUNKT = {
  hoch: "bg-red-500",
  mittel: "bg-amber-500",
  niedrig: "bg-green-500",
} as const;

function VorgangsZeile({ vorgang, heute }: { vorgang: VorgangKurz; heute: string }) {
  const frist = fristInfo(vorgang.frist, heute);
  // Überfällig oder bald fällig ist bei erledigten Vorgängen egal
  const ton = vorgang.status === "erledigt" ? "keine" : frist.ton;

  return (
    <li>
      <Link
        href={`/vorgang/${vorgang.id}`}
        className="flex min-h-20 flex-col gap-1 rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.99] hover:shadow-md dark:bg-slate-800"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              title={`Dringlichkeit: ${vorgang.dringlichkeit}`}
              className={`size-3 shrink-0 rounded-full ${DRINGLICHKEIT_PUNKT[vorgang.dringlichkeit]}`}
            />
            <span className="truncate text-lg font-semibold">{vorgang.absender}</span>
          </span>
          <StatusBadge status={vorgang.status} />
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {vorgang.kategorie}
          {vorgang.beispiel && (
            <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
              Beispiel
            </span>
          )}
        </span>
        <span className={`text-base ${FRIST_KLASSEN[ton]}`}>
          {frist.text}
          {!vorgang.frist_bestaetigt && vorgang.status !== "erledigt" && (
            <span className="ml-2 text-sm font-medium text-blue-700 dark:text-blue-400">· bitte prüfen</span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function Vorgangsliste({ vorgaenge, heute }: { vorgaenge: VorgangKurz[]; heute: string }) {
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

  // Die Liste kommt schon sortiert (nächste Frist zuerst, Erledigte am Ende)
  const aktiv = vorgaenge.filter((v) => v.status !== "erledigt");
  const erledigt = vorgaenge.filter((v) => v.status === "erledigt");

  return (
    <div className="flex flex-col gap-6">
      {aktiv.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {aktiv.map((vorgang) => (
            <VorgangsZeile key={vorgang.id} vorgang={vorgang} heute={heute} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-green-50 px-4 py-6 text-center text-base text-green-900 dark:bg-green-950 dark:text-green-200">
          Alles erledigt. 🎉
        </p>
      )}

      {erledigt.length > 0 && (
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl px-1 text-lg font-semibold">
            <span>Erledigt ({erledigt.length})</span>
            <span aria-hidden="true" className="text-slate-500 transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-3">
            {erledigt.map((vorgang) => (
              <VorgangsZeile key={vorgang.id} vorgang={vorgang} heute={heute} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
