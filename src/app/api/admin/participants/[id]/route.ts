import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_COOKIE } from "@/lib/auth";
import { PARTICIPANTS_TABLE } from "@/lib/participants";

// Loescht einen einzelnen Teilnehmer.
//
// Warum eine eigene Server-Route:
//   * Die RLS-Policies erlauben dem anon-Key bewusst KEIN delete auf
//     `participants`. Der Admin koennte das vom Client aus nicht
//     durchsetzen, ohne eine offene anon-delete-Policy zu oeffnen --
//     die wir hier explizit vermeiden wollen.
//   * Diese Route prueft den Admin-Cookie und nutzt den
//     SUPABASE_SERVICE_ROLE_KEY. Der Key verlaesst nie den Server.
//
// FK-Verhalten beim Loeschen (siehe schema.sql / migration
// add-participant-last-seen.sql):
//   * event_votes.participant_id            -> on delete cascade
//   * event_interest.participant_id         -> on delete cascade
//   * event_proposals.submitted_by_participant_id -> on delete set null
//
// Eingereichte Aktivitaeten bleiben also erhalten, nur der Bezug zum
// Einreicher wird entfernt. Stimmen und Interessen werden via FK
// Cascade automatisch von Postgres mitgeloescht.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeleteResponse = { ok: true } | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Nicht eingeloggt." } as DeleteResponse,
    { status: 401 },
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "true") {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Ungueltige Teilnehmer-ID." } as DeleteResponse,
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt. Bitte in den Environment-Variablen hinterlegen.",
      } as DeleteResponse,
      { status: 500 },
    );
  }

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. Diese Variable wird fuer das Loeschen von Teilnehmern benoetigt (server-only, nicht NEXT_PUBLIC_).",
      } as DeleteResponse,
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: deleteError, count } = await supabase
    .from(PARTICIPANTS_TABLE)
    .delete({ count: "exact" })
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      {
        ok: false,
        error: `Loeschen fehlgeschlagen: ${deleteError.message}`,
      } as DeleteResponse,
      { status: 500 },
    );
  }

  if ((count ?? 0) === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Teilnehmer wurde nicht gefunden (vielleicht schon geloescht).",
      } as DeleteResponse,
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true } as DeleteResponse);
}
