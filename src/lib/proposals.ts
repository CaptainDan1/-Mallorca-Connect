export const EVENT_PROPOSALS_TABLE = "event_proposals";

export type ProposalStatus = "proposal" | "confirmed" | "cancelled";

export const PROPOSAL_STATUS_OPTIONS: ProposalStatus[] = [
  "proposal",
  "confirmed",
  "cancelled",
];

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  proposal: "Idee",
  confirmed: "Findet statt",
  cancelled: "Abgesagt",
};

export const PROPOSAL_STATUS_BADGE: Record<ProposalStatus, string> = {
  proposal: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

export type ProposalModerationStatus = "pending" | "approved" | "rejected";

export const PROPOSAL_MODERATION_OPTIONS: ProposalModerationStatus[] = [
  "pending",
  "approved",
  "rejected",
];

export const PROPOSAL_MODERATION_LABELS: Record<
  ProposalModerationStatus,
  string
> = {
  pending: "Wartet auf Freigabe",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

export const PROPOSAL_MODERATION_BADGE: Record<
  ProposalModerationStatus,
  string
> = {
  pending: "bg-sky-100 text-sky-800 border-sky-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-slate-200 text-slate-700 border-slate-300",
};

// Erlaubte Werte fuer location_area. Freitext in der DB, aber im UI
// als Auswahl/Pille dargestellt. Reihenfolge geht im Uhrzeigersinn ab
// Norden, "Mitte" zum Schluss.
export const LOCATION_AREAS = [
  "Nord",
  "Nord-Ost",
  "Ost",
  "Sued-Ost",
  "Sued",
  "Sued-West",
  "West",
  "Nord-West",
  "Mitte",
] as const;

export type LocationArea = (typeof LOCATION_AREAS)[number];

// Pillen-Farben pro Himmelsrichtung (Tailwind). Fallback ist neutral.
export const LOCATION_AREA_BADGE: Record<string, string> = {
  Nord: "bg-sky-50 text-sky-800 ring-sky-100",
  "Nord-Ost": "bg-sky-50 text-sky-800 ring-sky-100",
  Ost: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  "Sued-Ost": "bg-emerald-50 text-emerald-800 ring-emerald-100",
  Sued: "bg-amber-50 text-amber-800 ring-amber-100",
  "Sued-West": "bg-amber-50 text-amber-800 ring-amber-100",
  West: "bg-rose-50 text-rose-800 ring-rose-100",
  "Nord-West": "bg-rose-50 text-rose-800 ring-rose-100",
  Mitte: "bg-violet-50 text-violet-800 ring-violet-100",
};

// Normalisiert Eingaben wie "süd-ost", "Süden", "SE" auf den
// kanonischen Wert. Gibt null zurueck, wenn sich nichts erkennen laesst.
export function normalizeLocationArea(input: unknown): LocationArea | null {
  if (typeof input !== "string") return null;
  const cleaned = input
    .trim()
    .toLowerCase()
    // ae/oe/ue -> a/o/u; Umlaute auch direkt entfernen
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "-")
    .replace(/^osten$/, "ost")
    .replace(/^norden$/, "nord")
    .replace(/^sueden$/, "sued")
    .replace(/^suden$/, "sued")
    .replace(/^westen$/, "west")
    .replace(/^mitte$|^zentrum$|^zentral$|^inland$/, "mitte");
  if (!cleaned) return null;
  // Match gegen unsere kanonischen Werte (auch in kleinbuchstaben)
  for (const area of LOCATION_AREAS) {
    if (
      area
        .toLowerCase()
        .replace(/ä/g, "a")
        .replace(/ö/g, "o")
        .replace(/ü/g, "u") === cleaned
    ) {
      return area;
    }
  }
  return null;
}

export type ProposalSlot = "morning" | "afternoon" | "evening";

export const PROPOSAL_SLOT_OPTIONS: ProposalSlot[] = [
  "morning",
  "afternoon",
  "evening",
];

export const PROPOSAL_SLOT_LABELS: Record<ProposalSlot, string> = {
  morning: "Vormittag",
  afternoon: "Nachmittag",
  evening: "Abend",
};

// Reisezeitraum 13.-17.06. (Jahr aus ai-context: 2026).
export const TRIP_DAYS: string[] = [
  "2026-06-13",
  "2026-06-14",
  "2026-06-15",
  "2026-06-16",
  "2026-06-17",
];

export function formatTripDay(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export type EventProposal = {
  id: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  event_start: string | null;
  duration: string | null;
  meeting_point: string | null;
  cost_note: string | null;
  image_path: string | null;
  status: ProposalStatus;
  moderation_status: ProposalModerationStatus;
  is_active: boolean;
  sort_order: number;
  scheduled_day: string | null;
  scheduled_slot: ProposalSlot | null;
  min_participants: number | null;
  capacity: number | null;
  plan_note: string | null;
  location_area: string | null;
  category: string | null;
  source_url: string | null;
  submitted_by_participant_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EventProposalInput = {
  title: string;
  short_description: string | null;
  long_description: string | null;
  event_start: string | null;
  duration: string | null;
  meeting_point: string | null;
  cost_note: string | null;
  image_path: string | null;
  status: ProposalStatus;
  moderation_status: ProposalModerationStatus;
  is_active: boolean;
  sort_order: number;
  scheduled_day: string | null;
  scheduled_slot: ProposalSlot | null;
  min_participants: number | null;
  capacity: number | null;
  plan_note: string | null;
  location_area: string | null;
  category: string | null;
  source_url: string | null;
};

export function emptyProposalInput(): EventProposalInput {
  return {
    title: "",
    short_description: null,
    long_description: null,
    event_start: null,
    duration: null,
    meeting_point: null,
    cost_note: null,
    image_path: null,
    status: "proposal",
    moderation_status: "approved",
    is_active: true,
    sort_order: 0,
    scheduled_day: null,
    scheduled_slot: null,
    min_participants: null,
    capacity: null,
    plan_note: null,
    location_area: null,
    category: null,
    source_url: null,
  };
}

// Slug-aehnliche Normalisierung fuer Dubletten-Vergleich auf Titel.
export function normalizeTitleSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Ein Vorschlag ist im Gruppenplan, sobald Tag UND Slot gesetzt sind.
export function isScheduled(
  proposal: Pick<EventProposal, "scheduled_day" | "scheduled_slot">,
): boolean {
  return Boolean(proposal.scheduled_day) && Boolean(proposal.scheduled_slot);
}

// Vorgemerkt: bereits in einem Slot, aber noch nicht final ("status" =
// "proposal"). Der Slot wird im Plan gedimmt angezeigt, finales Voting
// gibt es noch nicht. So sieht die Crew den Vorschlag schon, ohne ihn
// als fix zu missverstehen.
export function isTentative(
  proposal: Pick<
    EventProposal,
    "scheduled_day" | "scheduled_slot" | "status"
  >,
): boolean {
  return isScheduled(proposal) && proposal.status !== "confirmed";
}

// Fix: im Slot UND vom Admin als "Findet statt" bestaetigt. Erst hier
// gibt es das finale Teilnahme-Voting (Bin dabei / Vielleicht / Bin raus).
export function isFixed(
  proposal: Pick<
    EventProposal,
    "scheduled_day" | "scheduled_slot" | "status"
  >,
): boolean {
  return isScheduled(proposal) && proposal.status === "confirmed";
}

// `datetime-local`-Inputs liefern Strings ohne Zeitzone. Wir interpretieren
// sie als lokale Zeit, speichern aber als ISO-UTC in Postgres.
export function toLocalDatetimeInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromLocalDatetimeInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatProposalDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// `number | null` aus einem Input-Wert. Negative Werte werden auf 0
// geklemmt, leere Eingaben werden zu null.
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  const int = Math.trunc(num);
  return int < 0 ? 0 : int;
}
