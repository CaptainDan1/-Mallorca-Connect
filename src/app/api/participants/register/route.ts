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
import { normalizeName } from "@/lib/utils";

// Legt ein neues Profil + zugehoerige Credentials an. Bewusst KEIN
// echtes Auth-System -- es geht nur darum, dass ein Nutzer sein
// Profil auch auf einem anderen Geraet wiederfindet.
//
// Sicherheit:
//   * Diese Route ist nur erreichbar, wenn der globale PAGE_PASSWORD-
//     Cookie (mallorca_authenticated) gesetzt ist. Ohne den Cookie
//     greift die Middleware ohnehin schon, aber wir pruefen es hier
//     defensiv noch einmal.
//   * Passwort wird mit bcrypt gehashed, niemals im Klartext gespeichert.
//   * Antwort enthaelt ausschliesslich oeffentliche Profildaten,
//     niemals den Hash oder die normalisierte E-Mail im Klartext.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegisterBody = {
  display_name?: unknown;
  email?: unknown;
  password?: unknown;
  hotel_info?: unknown;
};

type RegisterResponse =
  | { ok: true; participant: ParticipantProfile }
  | { ok: false; error: string };

function bad(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error } as RegisterResponse,
    { status },
  );
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(AUTH_COOKIE)?.value !== "true") {
    return bad("Nicht eingeloggt.", 401);
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return bad("Ungueltige Anfrage.");
  }

  const display_name =
    typeof body.display_name === "string" ? normalizeName(body.display_name) : "";
  const email = normalizeEmail(
    typeof body.email === "string" ? body.email : "",
  );
  const password = typeof body.password === "string" ? body.password : "";
  const hotelRaw = typeof body.hotel_info === "string" ? body.hotel_info : "";
  const hotel_info = hotelRaw.trim() ? hotelRaw.trim() : null;

  if (!display_name) return bad("Bitte gib deinen Namen ein.");
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

  // Existiert die E-Mail schon? Eindeutigen Hinweis geben -- gern in
  // freundlicher Sprache, damit der Nutzer weiss, dass er sich
  // wahrscheinlich einfach einloggen kann.
  const { data: existingCred, error: lookupError } = await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .select("participant_id")
    .ilike("email_normalized", email)
    .maybeSingle();
  if (lookupError) {
    return bad(`Speichern fehlgeschlagen: ${lookupError.message}`, 500);
  }
  if (existingCred) {
    return bad(
      "Diese E-Mail ist bereits hinterlegt. Bitte logge dich ein.",
      409,
    );
  }

  // Participant anlegen.
  const nowIso = new Date().toISOString();
  const { data: created, error: insertError } = await supabase
    .from(PARTICIPANTS_TABLE)
    .insert({
      display_name,
      hotel_info,
      last_seen_at: nowIso,
    })
    .select(
      "id, display_name, hotel_info, avatar_url, last_seen_at, created_at, updated_at",
    )
    .single();
  if (insertError) {
    // Wahrscheinlichste Ursache: display_name kollidiert mit dem
    // case-insensitiven Unique-Index. Wir geben eine verstaendliche
    // Meldung statt der rohen Postgres-Fehlernachricht.
    const msg = insertError.message?.includes("participants_display_name_unique")
      ? "Diesen Namen gibt es schon. Bitte einen anderen waehlen."
      : `Speichern fehlgeschlagen: ${insertError.message}`;
    return bad(msg, 400);
  }
  const participant = created as ParticipantProfile;

  const password_hash = await hashPassword(password);

  const { error: credentialError } = await supabase
    .from(PARTICIPANT_CREDENTIALS_TABLE)
    .insert({
      participant_id: participant.id,
      email_normalized: email,
      password_hash,
      last_login_at: nowIso,
    });

  if (credentialError) {
    // Aufraeumen: ohne Credential ist das Profil eine Karteileiche fuer
    // unsere Anmeldelogik. Wir loeschen den frisch angelegten Datensatz
    // wieder, damit der Nutzer es noch mal versuchen kann.
    await supabase.from(PARTICIPANTS_TABLE).delete().eq("id", participant.id);
    return bad(
      `Login-Daten konnten nicht gespeichert werden: ${credentialError.message}`,
      500,
    );
  }

  return NextResponse.json(
    { ok: true, participant } as RegisterResponse,
    { status: 201 },
  );
}
