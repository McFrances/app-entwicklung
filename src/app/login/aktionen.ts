"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { leseSupabaseKonfiguration } from "@/lib/supabase/konfiguration";
import { erstelleServerClient } from "@/lib/supabase/server";

export type LoginStand =
  | { schritt: "eingabe"; fehler?: string; email?: string }
  | { schritt: "gesendet"; email: string };

const EmailSchema = z.email();

/** Adresse, unter der die App gerade erreichbar ist (für den Link in der E-Mail). */
async function appAdresse(): Promise<string> {
  const kopf = await headers();
  const origin = kopf.get("origin");
  if (origin) return origin;
  const host = kopf.get("x-forwarded-host") ?? kopf.get("host") ?? "localhost:3000";
  const protokoll = kopf.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protokoll}://${host}`;
}

export async function loginLinkSenden(_vorher: LoginStand, formData: FormData): Promise<LoginStand> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EmailSchema.safeParse(email).success) {
    return { schritt: "eingabe", fehler: "Bitte gib eine gültige E-Mail-Adresse ein.", email };
  }
  if (!leseSupabaseKonfiguration()) {
    return { schritt: "eingabe", fehler: "Supabase ist noch nicht eingerichtet.", email };
  }

  const supabase = await erstelleServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // /auth/confirm löst den Link aus der E-Mail ein und meldet den Nutzer an.
    options: { emailRedirectTo: `${await appAdresse()}/auth/confirm` },
  });

  if (error) {
    console.error(`Login-Link konnte nicht gesendet werden (${error.status} ${error.code}): ${error.message}`);
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return {
        schritt: "eingabe",
        fehler: "Zu viele Anfragen. Bitte warte etwa eine Minute und versuche es dann noch einmal.",
        email,
      };
    }
    if (error.code === "email_address_invalid") {
      return { schritt: "eingabe", fehler: "Diese E-Mail-Adresse wird nicht akzeptiert.", email };
    }
    return {
      schritt: "eingabe",
      fehler: "Der Login-Link konnte nicht gesendet werden. Bitte versuche es später noch einmal.",
      email,
    };
  }
  return { schritt: "gesendet", email };
}

export async function abmelden() {
  const supabase = await erstelleServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
