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
  };
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
