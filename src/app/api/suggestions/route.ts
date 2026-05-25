import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isEmailNotificationConfigured,
  sendAdminEmail,
} from "@/lib/email";
import {
  EVENT_PROPOSALS_TABLE,
  formatProposalDate,
} from "@/lib/proposals";
import { PARTICIPANTS_TABLE } from "@/lib/participants";

type SuggestionBody = {
  participant_id?: unknown;
  title?: unknown;
  short_description?: unknown;
  long_description?: unknown;
  event_start?: unknown;
  duration?: unknown;
  meeting_point?: unknown;
  cost_note?: unknown;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
      },
      { status: 500 },
    );
  }

  let body: SuggestionBody;
  try {
    body = (await request.json()) as SuggestionBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungueltige Anfrage." },
      { status: 400 },
    );
  }

  const participantId = typeof body.participant_id === "string" ? body.participant_id : null;
  const title = trimOrNull(body.title);

  if (!participantId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Bitte speichere zuerst deinen Namen.",
      },
      { status: 400 },
    );
  }

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "Bitte gib einen Titel ein." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  // Bestaetigen, dass der angegebene Teilnehmer existiert. Wenn nicht,
  // halten wir die Submitter-Referenz leer (statt einen FK-Fehler zu
  // werfen). Der Vorschlag wird trotzdem als "pending" gespeichert.
  let resolvedSubmitterId: string | null = null;
  let submitterName: string | null = null;
  let submitterHotel: string | null = null;
  try {
    const { data: profile } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select("id, display_name, hotel_info")
      .eq("id", participantId)
      .maybeSingle();
    if (profile) {
      const p = profile as {
        id: string;
        display_name: string;
        hotel_info: string | null;
      };
      resolvedSubmitterId = p.id;
      submitterName = p.display_name;
      submitterHotel = p.hotel_info;
    }
  } catch {
    // Egal -- wir speichern trotzdem.
  }

  const eventStart = trimOrNull(body.event_start);

  const insertPayload = {
    title,
    short_description: trimOrNull(body.short_description),
    long_description: trimOrNull(body.long_description),
    event_start: eventStart,
    duration: trimOrNull(body.duration),
    meeting_point: trimOrNull(body.meeting_point),
    cost_note: trimOrNull(body.cost_note),
    image_path: null,
    status: "proposal" as const,
    moderation_status: "pending" as const,
    is_active: false,
    sort_order: 0,
    submitted_by_participant_id: resolvedSubmitterId,
  };

  const { data, error } = await supabase
    .from(EVENT_PROPOSALS_TABLE)
    .insert(insertPayload)
    .select("id, title, event_start, meeting_point, short_description")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Vorschlag konnte nicht gespeichert werden: ${error.message}`,
      },
      { status: 500 },
    );
  }

  const inserted = data as {
    id: string;
    title: string;
    event_start: string | null;
    meeting_point: string | null;
    short_description: string | null;
  };

  let emailStatus: "sent" | "skipped" | "error" = "skipped";
  let emailNote: string | undefined;

  if (isEmailNotificationConfigured()) {
    const eventDateText = formatProposalDate(inserted.event_start) ?? "offen";
    const lines = [
      "Es wurde ein neuer Vorschlag fuer Mallorca-Connect eingereicht.",
      "",
      `Eingereicht von: ${submitterName ?? "Unbekannt"}` +
        (submitterHotel ? ` (${submitterHotel})` : ""),
      `Titel: ${inserted.title}`,
    ];
    if (inserted.short_description) {
      lines.push(`Kurzbeschreibung: ${inserted.short_description}`);
    }
    lines.push(`Startzeit: ${eventDateText}`);
    if (inserted.meeting_point) {
      lines.push(`Treffpunkt: ${inserted.meeting_point}`);
    }
    lines.push("");
    lines.push("Bitte im Adminbereich pruefen und freigeben.");

    const result = await sendAdminEmail({
      subject: "Neuer Mallorca-Connect Vorschlag",
      text: lines.join("\n"),
    });
    if (result.ok) {
      emailStatus = "sent";
    } else {
      emailStatus = "error";
      emailNote = "error" in result ? result.error : result.reason;
      console.error("[suggestions] E-Mail-Versand fehlgeschlagen:", emailNote);
    }
  }

  return NextResponse.json({
    ok: true,
    proposal_id: inserted.id,
    email: { status: emailStatus, note: emailNote },
  });
}
