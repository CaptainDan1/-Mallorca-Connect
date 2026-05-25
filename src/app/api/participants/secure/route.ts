import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import {
  PARTICIPANTS_TABLE,
  isLikelyEmail,
  normalizeEmail,
  type ParticipantProfile,
} from "@/lib/participants";
import {
  MIN_PASSWORD_LENGTH,
  PARTICIPANT_CREDENTIALS_TABLE,
} from "@/lib/credentials";
import { hashPassword } from "@/lib/password";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

// "Profil sichern" fuer Altprofile, die ueber localStorage erkannt
// werden, aber noch keine Credentials haben. Der Client liefert seine
// vorhandene participant_id (aus localStorage) zusammen mit E-Mail +
// Kennwort. Wir legen genau dann einen Credential-Datensatz an, wenn
// fuer diese ID noch keiner existiert.
//
// Hinweis zur Sicherheit:
//   Diese Route lebt vom "Eigentumsnachweis ueber die localStorage-
//   ID". Das ist KEIN echtes Auth-Modell, sondern die gleiche
//   pragmatische Annahme, die die ganze App seit Tag 1 trifft: Wer
//   das globale Gruppenpasswort und die ID hat, ist dieser Nutzer.
//   Deshalb pruefen wir defensiv:
//   - PAGE_PASSWORD-Cookie ist gesetzt
//   - Participant existiert
//   - Es gibt noch keinen Credential-Eintrag fuer diese ID
//   - Die E-Mail ist nicht schon fuer ein anderes Profil hinterlegt

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SecureBody = {
  participant_id?: unknown;
  email?: unknown;
  password?: unknown;
};

type SecureResponse =
  | { ok: true; participant: ParticipantProfile }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bad(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error } as SecureResponse,
    { status },
  );
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(AUTH_COOKIE)?.value !== "true") {
    return bad("Nicht eingeloggt.", 401);
  }

  let body: SecureBody;
  try {
    body = (await request.json()) as SecureBody;
  } catch {
    return bad("Ungueltige Anfrage.");
  }

  const participant_id =
    typeof body.participant_id === "string" ? body.participant_id : "";
  if (!participant_id || !UUID_RE.test(participant_id)) {
    return bad("Ungueltige Profil-ID.");
  }
  const email = normalizeEmail(
    typeof body.email === "string" ? body.email : "",
  );
  const password = typeof body.password === "string" ? body.password : "";
  if (!email) return bad("Bitte gib deine E-Mail an.");
  if (!isLikelyEmail(email)) {
    return bad("Diese E-Mail sieht nicht ganz richtig aus.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return bad(
      `Bitte waehle ein Kennwort mit mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
    );
  }

  const admin = getSupabaseAdminClient();
  if (!admin.ok) return bad(admin.error, 500);
  const supabase = admin.client;

  const { data: participantRaw, error: participantError } = await supabase
    .from(PARTICIPANTS_TABLE)
    .select(
      "id, display_name, hotel_info, avatar_url, last_seen_at, created_at, updated_at",
    )
    .eq("id", participant_id)
    .maybeSingle();
  if (participantError) {
    return bad(
      `Profil konnte nicht geladen werden: ${participantError.message}`,
      500,
    );
  }
  if (!participantRaw) {
    return bad("Profil wurde nicht gefunden.", 404);
  }
  const participant = participantRaw as ParticipantProfile;

  const { data: existingForId, error: existingForIdError } = await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .select("participant_id")
    .eq("participant_id", participant_id)
    .maybeSingle();
  if (existingForIdError) {
    return bad(
      `Speichern fehlgeschlagen: ${existingForIdError.message}`,
      500,
    );
  }
  if (existingForId) {
    return bad(
      "Dieses Profil ist bereits gesichert. Bitte logge dich ein.",
      409,
    );
  }

  const { data: existingForEmail, error: existingForEmailError } =
    await supabase
      .from(PARTICIPANT_CREDENTIALS_TABLE)
      .select("participant_id")
      .ilike("email_normalized", email)
      .maybeSingle();
  if (existingForEmailError) {
    return bad(
      `Speichern fehlgeschlagen: ${existingForEmailError.message}`,
      500,
    );
  }
  if (existingForEmail) {
    return bad(
      "Diese E-Mail ist bereits hinterlegt. Bitte logge dich ein.",
      409,
    );
  }

  const password_hash = await hashPassword(password);
  const nowIso = new Date().toISOString();

  const { error: insertError } = await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .insert({
      participant_id,
      email_normalized: email,
      password_hash,
      last_login_at: nowIso,
    });
  if (insertError) {
    return bad(
      `Speichern fehlgeschlagen: ${insertError.message}`,
      500,
    );
  }

  return NextResponse.json({ ok: true, participant } as SecureResponse);
}
