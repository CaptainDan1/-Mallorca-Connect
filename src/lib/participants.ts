export const PARTICIPANTS_TABLE = "participants";
export const EVENT_VOTES_TABLE = "event_votes";
export const PARTICIPANT_ID_STORAGE_KEY = "mallorca_participant_id";

export type ParticipantProfile = {
  id: string;
  display_name: string;
  hotel_info: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ParticipantInput = {
  display_name: string;
  hotel_info: string | null;
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
