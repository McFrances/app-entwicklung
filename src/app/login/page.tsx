import type { Metadata } from "next";
import { Suspense } from "react";
import { leseSupabaseKonfiguration } from "@/lib/supabase/konfiguration";
import { LoginFormular } from "./LoginFormular";

export const metadata: Metadata = {
  title: "Anmelden – Post-Assistent",
};

export default function LoginSeite({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Post-Assistent</h1>
        <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
          Melde dich an, um deine Briefe zu sehen.
        </p>
      </header>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />}>
        <LoginInhalt searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Eigene Komponente, weil sie erst bei der Anfrage läuft (liest die Adresse und die Umgebung)
async function LoginInhalt({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { fehler } = await searchParams;

  if (!leseSupabaseKonfiguration()) {
    return (
      <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
        <h2 className="text-lg font-semibold">Supabase ist noch nicht eingerichtet</h2>
        <p className="mt-2 text-base leading-relaxed">
          Trage in <code className="rounded bg-black/10 px-1">.env.local</code> die Werte{" "}
          <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
          <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> ein und
          starte die App neu. Die Schritte stehen in der README unter „Supabase einrichten“.
        </p>
      </div>
    );
  }

  return (
    <LoginFormular
      startFehler={
        fehler === "link"
          ? "Der Link ist ungültig oder abgelaufen. Fordere unten einen neuen an."
          : undefined
      }
    />
  );
}
