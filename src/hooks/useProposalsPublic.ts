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
import {
  EVENT_INTEREST_TABLE,
  type EventInterest,
} from "@/lib/interest";

export type UseProposalsPublicResult = {
  proposals: EventProposal[];
  votes: EventVote[];
  interests: EventInterest[];
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
  setInterest: (
    proposalId: string,
    participantId: string,
    interested: boolean,
  ) => Promise<boolean>;
  interestBusyFor: string | null;
  interestError: string | null;
};

export function useProposalsPublic(): UseProposalsPublicResult {
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [votes, setVotes] = useState<EventVote[]>([]);
  const [interests, setInterests] = useState<EventInterest[]>([]);
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [interestBusyFor, setInterestBusyFor] = useState<string | null>(null);
  const [interestError, setInterestError] = useState<string | null>(null);

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
      const [proposalsRes, votesRes, interestsRes, participantsRes] =
        await Promise.all([
          supabase
            .from(EVENT_PROPOSALS_TABLE)
            .select("*")
            .eq("is_active", true)
            .eq("moderation_status", "approved")
            .order("sort_order", { ascending: true })
            .order("event_start", { ascending: true, nullsFirst: false }),
          supabase.from(EVENT_VOTES_TABLE).select("*"),
          supabase.from(EVENT_INTEREST_TABLE).select("*"),
          supabase
            .from(PARTICIPANTS_TABLE)
            .select("id, display_name, hotel_info, avatar_url"),
        ]);
      if (proposalsRes.error) throw proposalsRes.error;
      if (votesRes.error) throw votesRes.error;
      if (interestsRes.error) throw interestsRes.error;
      if (participantsRes.error) throw participantsRes.error;

      if (!mountedRef.current) return;
      setProposals((proposalsRes.data as EventProposal[]) ?? []);
      setVotes((votesRes.data as EventVote[]) ?? []);
      setInterests((interestsRes.data as EventInterest[]) ?? []);
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

  // Realtime: event_proposals + event_votes + event_interest. Bei
  // votes/interest-Events laden wir den ganzen Satz neu, damit auch
  // unbekannte Teilnehmer mitgeholt werden. participants selbst hat
  // keinen eigenen Channel (Profile aendern sich selten).
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

    const interestChannel = supabase
      .channel("mallorca_event_interest")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: EVENT_INTEREST_TABLE },
        () => {
          if (!cancelled) void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(proposalsChannel);
      void supabase.removeChannel(votesChannel);
      void supabase.removeChannel(interestChannel);
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

  const setInterest = useCallback<UseProposalsPublicResult["setInterest"]>(
    async (proposalId, participantId, interested) => {
      if (!configured) {
        setInterestError(
          "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
        );
        return false;
      }

      setInterestBusyFor(proposalId);
      setInterestError(null);
      try {
        const supabase = getSupabaseClient();

        if (interested) {
          // Idempotenter Insert: on conflict (participant_id, proposal_id)
          // do nothing -- supabase-js per upsert mit ignoreDuplicates.
          const { data, error } = await supabase
            .from(EVENT_INTEREST_TABLE)
            .upsert(
              { participant_id: participantId, proposal_id: proposalId },
              {
                onConflict: "participant_id,proposal_id",
                ignoreDuplicates: true,
              },
            )
            .select()
            .maybeSingle();
          if (error) throw error;
          if (mountedRef.current) {
            // Wenn der Eintrag schon existierte, liefert Supabase null.
            // Optimistisch nichts zu tun -- der bestehende Eintrag ist
            // bereits in `interests`. Falls neu, lokal anhaengen.
            if (data) {
              const inserted = data as EventInterest;
              setInterests((prev) =>
                prev.some(
                  (i) =>
                    i.participant_id === inserted.participant_id &&
                    i.proposal_id === inserted.proposal_id,
                )
                  ? prev
                  : [...prev, inserted],
              );
            }
          }
        } else {
          const { error } = await supabase
            .from(EVENT_INTEREST_TABLE)
            .delete()
            .eq("participant_id", participantId)
            .eq("proposal_id", proposalId);
          if (error) throw error;
          if (mountedRef.current) {
            setInterests((prev) =>
              prev.filter(
                (i) =>
                  !(
                    i.participant_id === participantId &&
                    i.proposal_id === proposalId
                  ),
              ),
            );
          }
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Interesse konnte nicht gespeichert werden.";
        if (mountedRef.current) setInterestError(message);
        return false;
      } finally {
        if (mountedRef.current) setInterestBusyFor(null);
      }
    },
    [configured],
  );

  return {
    proposals,
    votes,
    interests,
    participants,
    isLoading,
    loadError,
    isConfigured: configured,
    reload: load,
    voteOn,
    votingFor,
    voteError,
    setInterest,
    interestBusyFor,
    interestError,
  };
}
