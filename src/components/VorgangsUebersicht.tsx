import { redirect } from "next/navigation";
import { connection } from "next/server";
import { abmelden } from "@/app/login/aktionen";
import { aktuellerNutzer, erstelleServerClient } from "@/lib/supabase/server";
import {
  heuteBerlin,
  sortiereVorgaenge,
  VORGANG_KURZ_SPALTEN,
  type VorgangKurz,
} from "@/lib/vorgang";
import { Vorgangsliste } from "./Vorgangsliste";

/** Lädt die Vorgänge des angemeldeten Nutzers (Row Level Security filtert den Rest). */
export async function VorgangsUebersicht() {
  // Nutzerdaten und das heutige Datum gibt es nur bei einer echten Anfrage, nie beim Vorab-Rendern
  await connection();
  const supabase = await erstelleServerClient();
  const nutzer = await aktuellerNutzer(supabase);
  if (!nutzer) redirect("/login");

  const { data, error } = await supabase
    .from("vorgang")
    .select(VORGANG_KURZ_SPALTEN)
    .limit(500)
    .overrideTypes<VorgangKurz[], { merge: false }>();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
        <span className="min-w-0 truncate">{nutzer.email ?? "Angemeldet"}</span>
        <form action={abmelden}>
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-xl px-3 font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
          >
            Abmelden
          </button>
        </form>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Vorgänge</h2>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200">
          Die Vorgänge konnten nicht geladen werden. Bitte lade die Seite neu.
        </p>
      ) : (
        <Vorgangsliste vorgaenge={sortiereVorgaenge(data ?? [])} heute={heuteBerlin()} />
      )}
    </>
  );
}

export function UebersichtLaedt() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  );
}
