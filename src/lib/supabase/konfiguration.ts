/**
 * Liest die Supabase-Zugangsdaten aus der Umgebung (.env.local).
 * Beide Werte sind öffentlich gedacht: Der Schutz der Daten kommt von Row Level Security
 * in der Datenbank, nicht von der Geheimhaltung dieses Schlüssels. Der geheime
 * "service_role"-Schlüssel wird in dieser App nie gebraucht und gehört nicht hierher.
 *
 * Hinweis: Diese Datei darf auch im Proxy (src/proxy.ts) laufen, daher kein "server-only".
 */
export function leseSupabaseKonfiguration(): { url: string; schluessel: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Der neue "publishable key" oder der ältere "anon key" – beide funktionieren.
  const schluessel =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !schluessel) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, schluessel };
}
