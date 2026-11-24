import { NextResponse, type NextRequest } from "next/server";
import { leseSupabaseKonfiguration } from "@/lib/supabase/konfiguration";
import { sitzungAktualisieren } from "@/lib/supabase/sitzung";

/** Seiten, die auch ohne Anmeldung erreichbar sind. */
function istOeffentlich(pfad: string) {
  return pfad === "/login" || pfad.startsWith("/auth/");
}

function umleiten(request: NextRequest, ziel: string, cookiesVon?: NextResponse) {
  const antwort = NextResponse.redirect(new URL(ziel, request.url));
  // Erneuerte Sitzungs-Cookies auch bei der Umleitung mitschicken
  cookiesVon?.cookies.getAll().forEach((cookie) => antwort.cookies.set(cookie));
  return antwort;
}

export async function proxy(request: NextRequest) {
  const pfad = request.nextUrl.pathname;

  // Ohne Supabase-Zugangsdaten gibt es nur die Login-Seite, die erklärt, was fehlt.
  if (!leseSupabaseKonfiguration()) {
    // Die API antwortet selbst mit einer verständlichen JSON-Fehlermeldung.
    return istOeffentlich(pfad) || pfad.startsWith("/api/") ? NextResponse.next() : umleiten(request, "/login");
  }

  const { antwort, angemeldet } = await sitzungAktualisieren(request);

  if (!angemeldet && !istOeffentlich(pfad)) {
    // Die API antwortet selbst mit 401 (JSON), statt auf eine Seite umzuleiten.
    if (pfad.startsWith("/api/")) return antwort;
    return umleiten(request, "/login", antwort);
  }
  if (angemeldet && pfad === "/login") return umleiten(request, "/", antwort);

  return antwort;
}

export const config = {
  // Alles außer statischen Dateien
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
