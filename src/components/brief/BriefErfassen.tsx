"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BILD_TYPEN,
  BriefAnalyseSchema,
  MAX_DATEIEN,
  MAX_DATEIGROESSE,
  MAX_GESAMTGROESSE,
  PDF_TYP,
  type BriefAnalyse,
} from "@/lib/brief-analyse";
import { fristSpeichern } from "@/app/vorgang/aktionen";
import { AnalyseErgebnis } from "./AnalyseErgebnis";
import { bildVerkleinern } from "./bild-verkleinern";
import { FristBestaetigung } from "./FristBestaetigung";

type Seite = {
  id: string;
  datei: File;
  vorschauUrl: string | null; // nur bei Bildern
};

type Zustand =
  | { schritt: "auswahl"; fehler?: string }
  | { schritt: "analyse" }
  | {
      schritt: "ergebnis";
      analyse: BriefAnalyse;
      beispiel: boolean;
      /** ID des gespeicherten Vorgangs; null, wenn das Speichern fehlgeschlagen ist */
      vorgangId: string | null;
      warnung?: string;
    };

const ERLAUBT = [...BILD_TYPEN, PDF_TYP].join(",");

export function BriefErfassen() {
  const [seiten, setSeiten] = useState<Seite[]>([]);
  const [zustand, setZustand] = useState<Zustand>({ schritt: "auswahl" });
  const [bereitetVor, setBereitetVor] = useState(false);
  const kameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Vorschau-URLs freigeben, wenn die Seite verlassen wird
  const seitenRef = useRef(seiten);
  useEffect(() => {
    seitenRef.current = seiten;
  }, [seiten]);
  useEffect(
    () => () => seitenRef.current.forEach((s) => s.vorschauUrl && URL.revokeObjectURL(s.vorschauUrl)),
    [],
  );

  async function dateienHinzufuegen(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    const neu = Array.from(liste);

    if (seiten.length + neu.length > MAX_DATEIEN) {
      setZustand({ schritt: "auswahl", fehler: `Höchstens ${MAX_DATEIEN} Seiten pro Brief.` });
      return;
    }
    const falsch = neu.find((d) => d.type !== PDF_TYP && !d.type.startsWith("image/"));
    if (falsch) {
      setZustand({ schritt: "auswahl", fehler: `„${falsch.name}“ ist kein Foto und keine PDF.` });
      return;
    }

    setBereitetVor(true);
    try {
      const verarbeitet = await Promise.all(neu.map(bildVerkleinern));
      const zuGross = verarbeitet.find((d) => d.size > MAX_DATEIGROESSE);
      if (zuGross) {
        setZustand({ schritt: "auswahl", fehler: `„${zuGross.name}“ ist zu groß (höchstens 10 MB).` });
        return;
      }
      setSeiten((alt) => [
        ...alt,
        ...verarbeitet.map((datei) => ({
          id: crypto.randomUUID(),
          datei,
          vorschauUrl: datei.type.startsWith("image/") ? URL.createObjectURL(datei) : null,
        })),
      ]);
      setZustand({ schritt: "auswahl" });
    } finally {
      setBereitetVor(false);
    }
  }

  function seiteEntfernen(id: string) {
    setSeiten((alt) => {
      const weg = alt.find((s) => s.id === id);
      if (weg?.vorschauUrl) URL.revokeObjectURL(weg.vorschauUrl);
      return alt.filter((s) => s.id !== id);
    });
  }

  async function analysieren() {
    const gesamt = seiten.reduce((summe, s) => summe + s.datei.size, 0);
    if (gesamt > MAX_GESAMTGROESSE) {
      setZustand({ schritt: "auswahl", fehler: "Die Seiten sind zusammen zu groß (höchstens 25 MB)." });
      return;
    }

    setZustand({ schritt: "analyse" });
    const formData = new FormData();
    seiten.forEach((s) => formData.append("seiten", s.datei));

    try {
      const antwort = await fetch("/api/brief/analysieren", { method: "POST", body: formData });
      const daten: unknown = await antwort.json().catch(() => null);
      if (!antwort.ok) {
        const meldung =
          daten && typeof daten === "object" && "fehler" in daten && typeof daten.fehler === "string"
            ? daten.fehler
            : "Die Analyse ist fehlgeschlagen. Bitte versuche es noch einmal.";
        setZustand({ schritt: "auswahl", fehler: meldung });
        return;
      }
      const geprueft = BriefAnalyseSchema.safeParse(
        daten && typeof daten === "object" && "analyse" in daten ? daten.analyse : null,
      );
      if (!geprueft.success) {
        setZustand({ schritt: "auswahl", fehler: "Die Antwort war unvollständig. Bitte versuche es noch einmal." });
        return;
      }
      const objekt = daten && typeof daten === "object" ? (daten as Record<string, unknown>) : {};
      setZustand({
        schritt: "ergebnis",
        analyse: geprueft.data,
        beispiel: objekt.beispiel === true,
        vorgangId: typeof objekt.vorgangId === "string" ? objekt.vorgangId : null,
        warnung: typeof objekt.warnung === "string" ? objekt.warnung : undefined,
      });
      window.scrollTo({ top: 0 });
    } catch {
      setZustand({
        schritt: "auswahl",
        fehler: "Keine Verbindung. Prüfe deine Internetverbindung und versuche es noch einmal.",
      });
    }
  }

  function neuBeginnen() {
    seiten.forEach((s) => s.vorschauUrl && URL.revokeObjectURL(s.vorschauUrl));
    setSeiten([]);
    setZustand({ schritt: "auswahl" });
  }

  if (zustand.schritt === "ergebnis") {
    return (
      <>
        <main className="flex flex-1 flex-col pb-32">
          <h1 className="mb-4 text-2xl font-bold">Dein Brief</h1>
          {zustand.beispiel && (
            <p
              role="note"
              className="mb-4 rounded-xl bg-violet-100 px-4 py-3 text-base text-violet-900 dark:bg-violet-950 dark:text-violet-200"
            >
              <strong>Beispielmodus:</strong> Das ist eine ausgedachte Beispiel-Antwort, keine echte
              Analyse deines Briefs.
            </p>
          )}
          {zustand.warnung ? (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-amber-100 px-4 py-3 text-base text-amber-950 dark:bg-amber-950 dark:text-amber-100"
            >
              {zustand.warnung}
            </p>
          ) : (
            <p
              role="status"
              className="mb-4 rounded-xl bg-green-100 px-4 py-3 text-base text-green-900 dark:bg-green-950 dark:text-green-200"
            >
              ✓ Als Vorgang gespeichert. Du findest ihn in der Übersicht.
            </p>
          )}
          <AnalyseErgebnis
            analyse={zustand.analyse}
            fristBereich={
              <FristBestaetigung
                vorschlag={zustand.analyse.frist}
                // Ohne gespeicherten Vorgang gilt die Bestätigung nur auf dieser Seite
                onBestaetigt={
                  zustand.vorgangId
                    ? (frist) => fristSpeichern(zustand.vorgangId as string, frist)
                    : undefined
                }
              />
            }
          />
        </main>
        <AktionsLeiste>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={neuBeginnen} className={NEBEN_BUTTON}>
              Weiterer Brief
            </button>
            <Link href="/" className={HAUPT_BUTTON}>
              Zur Übersicht
            </Link>
          </div>
        </AktionsLeiste>
      </>
    );
  }

  const laeuft = zustand.schritt === "analyse";

  return (
    <>
      <main className="flex flex-1 flex-col pb-32">
        <h1 className="text-2xl font-bold">Brief hinzufügen</h1>
        <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
          Fotografiere alle Seiten des Briefs oder lade Bilder bzw. eine PDF hoch.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={laeuft || bereitetVor}
            onClick={() => kameraRef.current?.click()}
            className={AUSWAHL_BUTTON}
          >
            <span aria-hidden="true" className="text-3xl">
              📷
            </span>
            Foto aufnehmen
          </button>
          <button
            type="button"
            disabled={laeuft || bereitetVor}
            onClick={() => uploadRef.current?.click()}
            className={AUSWAHL_BUTTON}
          >
            <span aria-hidden="true" className="text-3xl">
              📄
            </span>
            Bild oder PDF hochladen
          </button>
        </div>

        {/* Versteckte Dateifelder: capture öffnet auf dem Handy direkt die Kamera */}
        <input
          ref={kameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void dateienHinzufuegen(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={uploadRef}
          type="file"
          accept={`image/*,${ERLAUBT}`}
          multiple
          className="hidden"
          onChange={(e) => {
            void dateienHinzufuegen(e.target.files);
            e.target.value = "";
          }}
        />

        {zustand.schritt === "auswahl" && zustand.fehler && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {zustand.fehler}
          </p>
        )}

        <h2 className="mt-6 mb-3 text-lg font-semibold">
          Seiten {seiten.length > 0 && <span className="text-slate-500">({seiten.length})</span>}
        </h2>

        {seiten.length === 0 && !bereitetVor ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Noch keine Seite hinzugefügt.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {seiten.map((seite, index) => (
              <li
                key={seite.id}
                className="relative overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800"
              >
                {seite.vorschauUrl ? (
                  // Lokale Vorschau aus dem Browser, daher kein next/image
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={seite.vorschauUrl}
                    alt={`Seite ${index + 1}`}
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <span aria-hidden="true" className="text-4xl">
                      📄
                    </span>
                    <span className="line-clamp-2 text-sm break-all">{seite.datei.name}</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <button
                  type="button"
                  disabled={laeuft}
                  onClick={() => seiteEntfernen(seite.id)}
                  aria-label={`Seite ${index + 1} entfernen`}
                  className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80"
                >
                  ×
                </button>
              </li>
            ))}
            {bereitetVor && (
              <li className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
                Wird geladen …
              </li>
            )}
          </ul>
        )}
      </main>

      <AktionsLeiste>
        {laeuft ? (
          <p role="status" className="flex min-h-14 items-center justify-center gap-3 text-lg font-medium">
            <span className="size-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Brief wird gelesen …
          </p>
        ) : (
          <button
            type="button"
            onClick={analysieren}
            disabled={seiten.length === 0 || bereitetVor}
            className={HAUPT_BUTTON}
          >
            Brief analysieren
          </button>
        )}
      </AktionsLeiste>
    </>
  );
}

const HAUPT_BUTTON =
  "flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-600 px-6 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-[0.98] active:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-400";

const NEBEN_BUTTON =
  "flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-slate-300 px-4 text-lg font-semibold transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-600 dark:hover:bg-slate-800";

const AUSWAHL_BUTTON =
  "flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-3 text-base font-semibold text-blue-800 shadow-sm transition hover:border-blue-400 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300";

function AktionsLeiste({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-background/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}

export function ZurueckLink() {
  return (
    <Link
      href="/"
      className="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-base font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
    >
      <span aria-hidden="true">‹</span> Übersicht
    </Link>
  );
}
