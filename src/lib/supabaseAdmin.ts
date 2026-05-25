import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Helper. Niemals aus Client-Komponenten importieren.
// Liefert einen Supabase-Client mit SUPABASE_SERVICE_ROLE_KEY -- damit
// werden RLS-Policies umgangen. Aufrufer MUSS vorher selbst pruefen,
// ob der Aufruf erlaubt ist (z.B. Admin-Cookie, Eigentumsnachweis,
// Passwort-Verifikation).
export type AdminClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string };

export function getSupabaseAdminClient(): AdminClientResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt. Bitte in den Environment-Variablen hinterlegen.",
    };
  }
  if (!serviceRoleKey) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. Diese Variable wird fuer Login/Registrierung benoetigt (server-only, nicht NEXT_PUBLIC_).",
    };
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return { ok: true, client };
}
