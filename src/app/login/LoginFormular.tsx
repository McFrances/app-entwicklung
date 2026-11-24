"use client";

import { useActionState, useId } from "react";
import { loginLinkSenden, type LoginStand } from "./aktionen";

export function LoginFormular({ startFehler }: { startFehler?: string }) {
  const eingabeId = useId();
  const [stand, senden, laeuft] = useActionState<LoginStand, FormData>(loginLinkSenden, {
    schritt: "eingabe",
    fehler: startFehler,
  });

  if (stand.schritt === "gesendet") {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
        <p className="text-4xl" aria-hidden="true">
          📬
        </p>
        <h2 className="mt-3 text-xl font-semibold">Schau in dein Postfach</h2>
        <p className="mt-2 text-base leading-relaxed">
          Wir haben dir einen Login-Link an <strong className="break-all">{stand.email}</strong>{" "}
          geschickt. Tippe in der E-Mail auf den Link, dann bist du angemeldet.
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Nichts angekommen? Schau im Spam-Ordner nach. Der Link ist nur kurze Zeit gültig.
        </p>
        <form action={senden} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="email" value={stand.email} />
          <button
            type="submit"
            disabled={laeuft}
            className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-base font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            {laeuft ? "Wird gesendet …" : "Link erneut senden"}
          </button>
          {/* Normaler Link: lädt die Seite neu und zeigt wieder das leere Formular */}
          <a
            href="/login"
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 text-base font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
          >
            Andere Adresse
          </a>
        </form>
      </div>
    );
  }

  return (
    <form action={senden} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
      <label htmlFor={eingabeId} className="block text-base font-medium">
        Deine E-Mail-Adresse
      </label>
      <input
        id={eingabeId}
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={stand.email}
        placeholder="name@beispiel.de"
        aria-describedby={stand.fehler ? `${eingabeId}-fehler` : undefined}
        aria-invalid={stand.fehler ? true : undefined}
        className="mt-2 block min-h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-base dark:border-slate-600 dark:bg-slate-900"
      />
      {stand.fehler && (
        <p
          id={`${eingabeId}-fehler`}
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {stand.fehler}
        </p>
      )}
      <button
        type="submit"
        disabled={laeuft}
        className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-600 px-6 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-[0.98] active:bg-blue-700 disabled:opacity-60"
      >
        {laeuft ? "Wird gesendet …" : "Login-Link senden"}
      </button>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Kein Passwort nötig: Du bekommst einen Link per E-Mail. Neue Adressen werden dabei
        automatisch registriert.
      </p>
    </form>
  );
}
