import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_COOKIE } from "@/lib/auth";
import { EVENT_PROPOSALS_TABLE } from "@/lib/proposals";

// Endgueltiges Loeschen aller inaktiven Vorschlaege.
//
// Warum eine eigene Server-Route:
//   * Die RLS-Policies erlauben dem anon-Key bewusst KEIN delete auf
//     `event_proposals` -- normaler Soft-Delete erfolgt via Update auf
//     `is_active=false`. Wenn wir das hier vom Client aus per anon-Key
//     versuchen wuerden, wuerde die Policy stillschweigend 0 Zeilen
//     loeschen.
//   * Eine offene anon-delete-Policy waere unsicher (jeder mit
//     PAGE_PASSWORD koennte alles plattmachen). Statt dessen pruefen wir
//     hier serverseitig den Admin-Cookie und nutzen den
//     SUPABASE_SERVICE_ROLE_KEY -- der niemals den Browser verlaesst.
//
// Sicherheit:
//   * `ADMIN_COOKIE` muss gesetzt sein -- die Route ist sonst 401.
//   * Wir filtern auf `is_active=false` SERVERSEITIG -- der Client kann
//     keine IDs einschleusen.
//   * `SUPABASE_SERVICE_ROLE_KEY` ist server-only (kein NEXT_PUBLIC_).
//
// FK-Cascade:
//   * `event_votes.proposal_id` -> on delete cascade
//   * `event_interest.proposal_id` -> on delete cascade
//   Beim Hard-Delete eines Proposals werden die zugehoerigen Stimmen
//   und Interessen automatisch von Postgres entfernt.
//
// Storage:
//   * Verwaiste Bilder in Supabase Storage werden hier BEWUSST nicht
//     mitgeloescht. Aktivitaetsbilder koennen externe URLs sein oder
//     in mehreren Vorschlaegen referenziert werden. Falls spaeter
//     gewuenscht: eigene Aufraeum-Aktion.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeleteResponse =
  | { ok: true; count: number }
  | { ok: false; error: string };

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Nicht eingeloggt." } as DeleteResponse,
    { status: 401 },
  );
}

export async function DELETE(request: NextRequest) {
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "true") {
    return unauthorized();
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
          "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. Diese Variable wird fuer das endgueltige Loeschen benoetigt (server-only, nicht NEXT_PUBLIC_).",
      } as DeleteResponse,
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Erst zaehlen, damit wir dem Admin eine ehrliche Erfolgsmeldung
  // zurueckgeben koennen ("X Aktivitaeten wurden geloescht.").
  const { count: beforeCount, error: countError } = await supabase
    .from(EVENT_PROPOSALS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("is_active", false);

  if (countError) {
    return NextResponse.json(
      {
        ok: false,
        error: `Zaehlen fehlgeschlagen: ${countError.message}`,
      } as DeleteResponse,
      { status: 500 },
    );
  }

  if ((beforeCount ?? 0) === 0) {
    return NextResponse.json({ ok: true, count: 0 } as DeleteResponse);
  }

  // Harter Delete. Filter auf `is_active=false` ist hier zwingend --
  // ohne den wuerden alle Zeilen geloescht.
  const { error: deleteError, count: deletedCount } = await supabase
    .from(EVENT_PROPOSALS_TABLE)
    .delete({ count: "exact" })
    .eq("is_active", false);

  if (deleteError) {
    return NextResponse.json(
      {
        ok: false,
        error: `Loeschen fehlgeschlagen: ${deleteError.message}`,
      } as DeleteResponse,
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: deletedCount ?? beforeCount ?? 0,
  } as DeleteResponse);
}
