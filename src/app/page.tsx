import Link from "next/link";
import { Suspense } from "react";
import { UebersichtLaedt, VorgangsUebersicht } from "@/components/VorgangsUebersicht";

export default function Startseite() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Post-Assistent</h1>
        <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
          Deine Briefe und Vorgänge auf einen Blick.
        </p>
      </header>

      <main className="flex flex-1 flex-col pb-32">
        {/* Die Vorgänge hängen vom Login ab und werden erst bei der Anfrage geladen */}
        <Suspense fallback={<UebersichtLaedt />}>
          <VorgangsUebersicht />
        </Suspense>
      </main>

      {/* Großer Button, fest am unteren Rand – gut mit dem Daumen erreichbar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-background/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800">
        <div className="mx-auto max-w-xl">
          <Link
            href="/brief/neu"
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-400 active:scale-[0.98] active:bg-blue-700"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              +
            </span>
            Brief hinzufügen
          </Link>
        </div>
      </div>
    </div>
  );
}
