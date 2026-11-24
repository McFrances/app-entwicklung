import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { leseSupabaseKonfiguration } from "./konfiguration";

/**
 * Supabase-Client für Server Components, Server Actions und Route Handler.
 * Er handelt im Namen des angemeldeten Nutzers (Sitzung aus dem Cookie), deshalb
 * greift Row Level Security: Er sieht nur Daten des Nutzers.
 */
export async function erstelleServerClient(): Promise<SupabaseClient> {
  // Zuerst die Cookies: Das macht den Code "erst bei der Anfrage" und verhindert, dass die
  // Prüfung unten schon beim Vorbauen der Seiten (next build) läuft.
  const cookieSpeicher = await cookies();
  const konfiguration = leseSupabaseKonfiguration();
  if (!konfiguration) {
    throw new Error(
      "Supabase ist nicht eingerichtet: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlen in .env.local.",
    );
  }

  return createServerClient(konfiguration.url, konfiguration.schluessel, {
    cookies: {
      getAll() {
        return cookieSpeicher.getAll();
      },
      setAll(zuSetzen) {
        try {
          zuSetzen.forEach(({ name, value, options }) => cookieSpeicher.set(name, value, options));
        } catch {
          // In Server Components lassen sich keine Cookies setzen. Das ist unkritisch,
          // weil der Proxy (src/proxy.ts) die Sitzung bei jeder Anfrage erneuert.
        }
      },
    },
  });
}

export type Nutzer = { id: string; email: string | null };

/** Prüft die Anmeldung anhand des signierten Tokens und liefert den Nutzer oder null. */
export async function aktuellerNutzer(supabase: SupabaseClient): Promise<Nutzer | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}
