import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { fristSpeichern } from "@/app/vorgang/aktionen";
import { AnalyseErgebnis, Karte } from "@/components/brief/AnalyseErgebnis";
import { FristBestaetigung } from "@/components/brief/FristBestaetigung";
import { StatusAuswahl } from "@/components/vorgang/StatusAuswahl";
import { VorgangLoeschen } from "@/components/vorgang/VorgangLoeschen";
import { aktuellerNutzer, erstelleServerClient } from "@/lib/supabase/server";
import type { DokumentZeile, VorgangZeile } from "@/lib/vorgang";
import { BUCKET } from "@/lib/vorgang-speichern.server";

export const metadata: Metadata = {
  title: "Vorgang – Post-Assistent",
};

export default function VorgangSeite({ params }: PageProps<"/vorgang/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
      <nav className="mb-3">
        <Link
          href="/"
          className="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-base font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true">‹</span> Übersicht
        </Link>
      </nav>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />}>
        <VorgangDetail params={params} />
      </Suspense>
    </div>
  );
}

async function VorgangDetail({ params }: { params: PageProps<"/vorgang/[id]">["params"] }) {
  // Nutzerdaten gibt es nur bei einer echten Anfrage, nie beim Vorab-Rendern
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await erstelleServerClient();
  const nutzer = await aktuellerNutzer(supabase);
  if (!nutzer) redirect("/login");

  // Row Level Security liefert hier nur Vorgänge des angemeldeten Nutzers. Fremde IDs → 404.
  const { data: vorgang, error } = await supabase
    .from("vorgang")
    .select("*")
    .eq("id", id)
    .maybeSingle<VorgangZeile>();
  if (error) {
    console.error("Vorgang konnte nicht geladen werden:", error.message);
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200">
        Der Vorgang konnte nicht geladen werden. Bitte lade die Seite neu.
      </p>
    );
  }
  if (!vorgang) notFound();

  const { data: dokumente } = await supabase
    .from("dokument")
    .select("id, vorgang_id, seite, speicherpfad, dateiname, mime_typ, groesse_bytes")
    .eq("vorgang_id", id)
    .order("seite")
    .overrideTypes<DokumentZeile[], { merge: false }>();

  // Der Bucket ist privat: Dateien gibt es nur über Links, die nach einer Stunde ablaufen.
  const links = new Map<string, string>();
  if (dokumente && dokumente.length > 0) {
    const { data: signiert } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        dokumente.map((d) => d.speicherpfad),
        3600,
      );
    signiert?.forEach((eintrag) => {
      if (eintrag.path && eintrag.signedUrl) links.set(eintrag.path, eintrag.signedUrl);
    });
  }

  return (
    <>
      {vorgang.beispiel && (
        <p
          role="note"
          className="mb-4 rounded-xl bg-violet-100 px-4 py-3 text-base text-violet-900 dark:bg-violet-950 dark:text-violet-200"
        >
          <strong>Beispiel:</strong> Dieser Vorgang stammt aus dem Beispielmodus und ist keine echte
          Analyse.
        </p>
      )}

      <AnalyseErgebnis
        analyse={vorgang}
        extra={
          <Karte titel="Status">
            <StatusAuswahl vorgangId={vorgang.id} status={vorgang.status} />
          </Karte>
        }
        fristBereich={
          <FristBestaetigung
            vorschlag={vorgang.frist}
            startBestaetigt={vorgang.frist_bestaetigt}
            onBestaetigt={fristSpeichern.bind(null, vorgang.id)}
          />
        }
      />

      {dokumente && dokumente.length > 0 && (
        <div className="mt-4">
          <Karte titel="Seiten des Briefs">
            <ul className="grid grid-cols-2 gap-3">
              {dokumente.map((dokument) => {
                const link = links.get(dokument.speicherpfad);
                const istBild = dokument.mime_typ.startsWith("image/");
                return (
                  <li key={dokument.id}>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        {istBild ? (
                          // Signierte Storage-Links wechseln, daher kein next/image
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={link} alt={`Seite ${dokument.seite}`} className="aspect-[3/4] w-full object-cover" />
                        ) : (
                          <span className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 p-3 text-center">
                            <span aria-hidden="true" className="text-4xl">
                              📄
                            </span>
                            <span className="text-sm font-medium">PDF öffnen</span>
                          </span>
                        )}
                        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-sm font-semibold text-white">
                          {dokument.seite}
                        </span>
                      </a>
                    ) : (
                      <span className="flex aspect-[3/4] items-center justify-center rounded-xl bg-slate-100 p-3 text-center text-sm text-slate-500 dark:bg-slate-900">
                        Seite {dokument.seite} nicht verfügbar
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Karte>
        </div>
      )}

      <div className="mt-6">
        <VorgangLoeschen vorgangId={vorgang.id} />
      </div>
    </>
  );
}
