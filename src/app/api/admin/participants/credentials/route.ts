import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { PARTICIPANT_CREDENTIALS_TABLE } from "@/lib/credentials";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

// Liefert dem Adminbereich die Wiedererkennungs-Metadaten zu allen
// Teilnehmern (E-Mail + letzter Login). Diese Daten sind NICHT
// oeffentlich -- die `participant_credentials`-Tabelle ist via RLS
// fuer anon dicht. Diese Route prueft den Admin-Cookie und nutzt
// SUPABASE_SERVICE_ROLE_KEY.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type AdminCredentialSummary = {
  participant_id: string;
  email: string;
  last_login_at: string | null;
};

type Response =
  | { ok: true; credentials: AdminCredentialSummary[] }
  | { ok: false; error: string };

export async function GET(request: NextRequest) {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "true") {
    return NextResponse.json(
      { ok: false, error: "Nicht eingeloggt." } as Response,
      { status: 401 },
    );
  }

  const admin = getSupabaseAdminClient();
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error } as Response,
      { status: 500 },
    );
  }
  const supabase = admin.client;

  const { data, error } = await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .select("participant_id, email_normalized, last_login_at");
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Laden fehlgeschlagen: ${error.message}`,
      } as Response,
      { status: 500 },
    );
  }

  const credentials: AdminCredentialSummary[] = (
    (data as Array<{
      participant_id: string;
      email_normalized: string;
      last_login_at: string | null;
    }>) ?? []
  ).map((row) => ({
    participant_id: row.participant_id,
    email: row.email_normalized,
    last_login_at: row.last_login_at,
  }));

  return NextResponse.json({ ok: true, credentials } as Response);
}
