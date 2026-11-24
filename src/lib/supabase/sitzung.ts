import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { leseSupabaseKonfiguration } from "./konfiguration";

/**
 * Erneuert die Anmelde-Sitzung (Cookies) bei jeder Anfrage und meldet zurück,
 * ob jemand angemeldet ist. Wird vom Proxy (src/proxy.ts) aufgerufen.
 */
export async function sitzungAktualisieren(request: NextRequest) {
  const konfiguration = leseSupabaseKonfiguration();
  if (!konfiguration) throw new Error("Supabase ist nicht eingerichtet.");

  let antwort = NextResponse.next({ request });

  const supabase = createServerClient(konfiguration.url, konfiguration.schluessel, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(zuSetzen, kopfzeilen) {
        zuSetzen.forEach(({ name, value }) => request.cookies.set(name, value));
        antwort = NextResponse.next({ request });
        zuSetzen.forEach(({ name, value, options }) => antwort.cookies.set(name, value, options));
        // Cache-Kopfzeilen von Supabase übernehmen, damit Antworten mit Sitzungs-Cookies nicht gecacht werden
        Object.entries(kopfzeilen).forEach(([name, wert]) => antwort.headers.set(name, wert));
      },
    },
  });

  // getClaims prüft das signierte Token und erneuert es bei Bedarf.
  const { data } = await supabase.auth.getClaims();
  return { antwort, angemeldet: Boolean(data?.claims?.sub) };
}
