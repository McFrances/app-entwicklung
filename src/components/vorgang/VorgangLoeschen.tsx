"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { vorgangLoeschen } from "@/app/vorgang/aktionen";

export function VorgangLoeschen({ vorgangId }: { vorgangId: string }) {
  const router = useRouter();
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, starte] = useTransition();

  function loeschen() {
    if (!window.confirm("Diesen Vorgang mit allen Seiten endgültig löschen?")) return;
    setFehler(null);
    starte(async () => {
      const ergebnis = await vorgangLoeschen(vorgangId);
      if (ergebnis.ok) router.replace("/");
      else setFehler(ergebnis.fehler);
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={laeuft}
        onClick={loeschen}
        className="min-h-12 w-full rounded-xl border-2 border-red-200 px-4 text-base font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {laeuft ? "Wird gelöscht …" : "Vorgang löschen"}
      </button>
      {fehler && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200">
          {fehler}
        </p>
      )}
    </div>
  );
}
