import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import {
  PARTICIPANTS_TABLE,
  normalizeEmail,
  type ParticipantProfile,
} from "@/lib/participants";
import { PARTICIPANT_CREDENTIALS_TABLE } from "@/lib/credentials";
import { verifyPassword } from "@/lib/password";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

// Loggt einen Nutzer per E-Mail/Kennwort wieder ein. Kein Cookie-
// Session-State -- die Wiedererkennung laeuft, indem wir dem Client
// die participant.id zurueckgeben, die er lokal im localStorage
// speichert (gleiche Logik wie bisher).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoginBody = { email?: unknown; password?: unknown };

type LoginResponse =
  | { ok: true; participant: ParticipantProfile }
  | { ok: false; error: string };

function bad(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error } as LoginResponse,
    { status },
  );
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(AUTH_COOKIE)?.value !== "true") {
    return bad("Nicht eingeloggt.", 401);
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return bad("Ungueltige Anfrage.");
  }

  const email = normalizeEmail(
    typeof body.email === "string" ? body.email : "",
  );
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return bad("Bitte E-Mail und Kennwort angeben.");
  }

  const admin = getSupabaseAdminClient();
  if (!admin.ok) return bad(admin.error, 500);
  const supabase = admin.client;

  // Credentials lookup. Wir geben bei "nicht gefunden" und "falsches
  // Passwort" bewusst dieselbe Fehlermeldung -- so kann niemand
  // ausprobieren, welche E-Mails Profile haben.
  const GENERIC_LOGIN_ERROR = "E-Mail oder Kennwort stimmt nicht.";

  const { data: credRaw, error: credError } = await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .select("participant_id, password_hash")
    .ilike("email_normalized", email)
    .maybeSingle();
  if (credError) {
    return bad(`Login fehlgeschlagen: ${credError.message}`, 500);
  }
  if (!credRaw) {
    return bad(GENERIC_LOGIN_ERROR, 401);
  }
  const cred = credRaw as {
    participant_id: string;
    password_hash: string;
  };

  const ok = await verifyPassword(password, cred.password_hash);
  if (!ok) {
    return bad(GENERIC_LOGIN_ERROR, 401);
  }

  const nowIso = new Date().toISOString();

  // last_login_at + last_seen_at mitziehen. Fehler dabei sind nicht
  // fatal -- wenn das Update fehlschlaegt, ist der Login trotzdem
  // erfolgreich. Wir loggen es einfach nicht.
  await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .update({ last_login_at: nowIso })
    .eq("participant_id", cred.participant_id);

  const { data: participantRaw, error: participantError } = await supabase
    .from(PARTICIPANTS_TABLE)
    .update({ last_seen_at: nowIso })
    .eq("id", cred.participant_id)
    .select(
      "id, display_name, hotel_info, avatar_url, last_seen_at, created_at, updated_at",
    )
    .single();
  if (participantError || !participantRaw) {
    return bad(
      `Profil konnte nicht geladen werden: ${participantError?.message ?? "unbekannt"}`,
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    participant: participantRaw as ParticipantProfile,
  } as LoginResponse);
}
