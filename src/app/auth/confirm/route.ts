import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { leseSupabaseKonfiguration } from "@/lib/supabase/konfiguration";
import { erstelleServerClient } from "@/lib/supabase/server";

const OTP_TYPEN: readonly EmailOtpType[] = ["email", "magiclink", "signup", "recovery", "invite", "email_change"];

function istOtpTyp(wert: string | null): wert is EmailOtpType {
  return wert !== null && (OTP_TYPEN as readonly string[]).includes(wert);
}

/**
 * Löst den Login-Link aus der E-Mail ein.
 * - ?token_hash=…&type=email  (empfohlen, funktioniert auch, wenn der Link in einem anderen
 *   Browser oder in der Mail-App geöffnet wird; braucht die angepasste E-Mail-Vorlage)
 * - ?code=…                   (Standardvorlage von Supabase, funktioniert nur im selben Browser,
 *   in dem der Link angefordert wurde)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const typ = searchParams.get("type");
  const code = searchParams.get("code");

  let erfolg = false;
  if (leseSupabaseKonfiguration()) {
    const supabase = await erstelleServerClient();
    if (tokenHash && istOtpTyp(typ)) {
      const { error } = await supabase.auth.verifyOtp({ type: typ, token_hash: tokenHash });
      erfolg = !error;
      if (error) console.error(`Login-Link ungültig (${error.status} ${error.code}): ${error.message}`);
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      erfolg = !error;
      if (error) console.error(`Login-Code ungültig (${error.status} ${error.code}): ${error.message}`);
    }
  }

  redirect(erfolg ? "/" : "/login?fehler=link");
}
