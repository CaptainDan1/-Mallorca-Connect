export const PARTICIPANTS_TABLE = "participants";
export const EVENT_VOTES_TABLE = "event_votes";
export const PARTICIPANT_ID_STORAGE_KEY = "mallorca_participant_id";

export type ParticipantProfile = {
  id: string;
  display_name: string;
  hotel_info: string | null;
  avatar_url: string | null;
  email?: string | null;
  last_seen_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Mindestintervall zwischen zwei `last_seen_at`-Updates pro Profil.
// Verhindert, dass jeder Render einen Supabase-Roundtrip ausloest.
export const LAST_SEEN_REFRESH_MS = 15 * 60 * 1000;

// Trim + lowercase. Leere Eingaben werden zu null, damit das Frontend
// und der Hook einheitlich entscheiden koennen: keine E-Mail = kein
// Match, keine Wiedererkennung.
export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

// Sehr pragmatische E-Mail-Pruefung. Keine RFC-Compliance, sondern
// genug, damit "max@meier" oder " " durchfallen.
export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type ParticipantInput = {
  display_name: string;
  hotel_info: string | null;
  email: string;
};

export type EventVoteChoice = "in" | "maybe" | "out";

export const VOTE_OPTIONS: EventVoteChoice[] = ["in", "maybe", "out"];

export const VOTE_LABELS: Record<EventVoteChoice, string> = {
  in: "Bin dabei",
  maybe: "Vielleicht",
  out: "Bin raus",
};

export const VOTE_SHORT_LABELS: Record<EventVoteChoice, string> = {
  in: "Dabei",
  maybe: "Vielleicht",
  out: "Raus",
};

export type EventVote = {
  id: string;
  participant_id: string;
  proposal_id: string;
  vote: EventVoteChoice;
  created_at: string;
  updated_at: string;
};
