"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_VOTES_TABLE,
  PARTICIPANTS_TABLE,
  type EventVote,
  type EventVoteChoice,
  type ParticipantProfile,
} from "@/lib/participants";
import {
  EVENT_PROPOSALS_TABLE,
  type EventProposal,
} from "@/lib/proposals";

export type UseProposalsPublicResult = {
  proposals: EventProposal[];
  votes: EventVote[];
  participants: ParticipantProfile[];
  isLoading: boolean;
  loadError: string | null;
  isConfigured: boolean;
  reload: () => Promise<void>;
  voteOn: (
    proposalId: string,
    participantId: string,
    vote: EventVoteChoice,
  ) => Promise<boolean>;
  votingFor: string | null;
  voteError: string | null;
};

export function useProposalsPublic(): UseProposalsPublicResult {
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [votes, setVotes] = useState<EventVote[]>([]);
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!configured) {
      setIsLoading(false);
      setLoadError(
        "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
      );
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseClient();
      const [proposalsRes, votesRes, participantsRes] = await Promise.all([
        supabase
          .from(EVENT_PROPOSALS_TABLE)
          .select("*")
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .order("sort_order", { ascending: true })
          .order("event_start", { ascending: true, nullsFirst: false }),
        supabase.from(EVENT_VOTES_TABLE).select("*"),
        supabase
          .from(PARTICIPANTS_TABLE)
          .select("id, display_name, hotel_info, avatar_url"),
      ]);
      if (proposalsRes.error) throw proposalsRes.error;
      if (votesRes.error) throw votesRes.error;
      if (participantsRes.error) throw participantsRes.error;

      if (!mountedRef.current) return;
      setProposals((proposalsRes.data as EventProposal[]) ?? []);
      setVotes((votesRes.data as EventVote[]) ?? []);
      setParticipants(
        (participantsRes.data as ParticipantProfile[]) ?? [],
      );
    } catch (error) {
      if (!mountedRef.current) return;
      const message =
        error instanceof Error
          ? error.message
          : "Daten konnten nicht geladen werden.";
      setLoadError(message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [configured]);

  // Initial laden.
  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Realtime: event_proposals + event_votes. Bei votes-Events laden wir
  // zusaetzlich participants nach, falls ein neuer Voter unbekannt ist.
  // Auf participants selbst legen wir keinen Channel (in Schritt 1 wurde
  // Realtime nur fuer proposals/votes aktiviert; Profil-Renames sind
  // selten und werden beim naechsten Vote-Event automatisch mitgeholt).
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    const supabase = getSupabaseClient();

    const proposalsChannel = supabase
      .channel("mallorca_event_proposals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: EVENT_PROPOSALS_TABLE },
        () => {
          if (!cancelled) void load();
        },
      )
      .subscribe();

    const votesChannel = supabase
      .channel("mallorca_event_votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: EVENT_VOTES_TABLE },
        () => {
          if (!cancelled) void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(proposalsChannel);
      void supabase.removeChannel(votesChannel);
    };
  }, [configured, load]);

  const voteOn = useCallback<UseProposalsPublicResult["voteOn"]>(
    async (proposalId, participantId, vote) => {
      if (!configured) {
        setVoteError(
          "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
        );
        return false;
      }

      setVotingFor(proposalId);
      setVoteError(null);
      try {
        const supabase = getSupabaseClient();

        const payload = {
          participant_id: participantId,
          proposal_id: proposalId,
          vote,
        };

        const { data, error } = await supabase
          .from(EVENT_VOTES_TABLE)
          .upsert(payload, { onConflict: "participant_id,proposal_id" })
          .select()
          .single();
        if (error) throw error;

        // Optimistic local update, Realtime gleicht ggf. nach.
        if (mountedRef.current && data) {
          const newVote = data as EventVote;
          setVotes((prev) => {
            const idx = prev.findIndex(
              (v) =>
                v.participant_id === newVote.participant_id &&
                v.proposal_id === newVote.proposal_id,
            );
            if (idx === -1) return [...prev, newVote];
            const copy = prev.slice();
            copy[idx] = newVote;
            return copy;
          });
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Stimme konnte nicht gespeichert werden.";
        if (mountedRef.current) setVoteError(message);
        return false;
      } finally {
        if (mountedRef.current) setVotingFor(null);
      }
    },
    [configured],
  );

  return {
    proposals,
    votes,
    participants,
    isLoading,
    loadError,
    isConfigured: configured,
    reload: load,
    voteOn,
    votingFor,
    voteError,
  };
}
