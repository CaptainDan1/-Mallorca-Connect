"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { ProfileCard } from "@/components/ProfileCard";
import { ActivityDiscovery } from "@/components/ActivityDiscovery";
import { GroupPlan } from "@/components/GroupPlan";
import { ProposalDetail } from "@/components/ProposalDetail";
import { SuggestProposalModal } from "@/components/SuggestProposalModal";
import { Toast, type ToastVariant } from "@/components/Toast";
import { useParticipant } from "@/hooks/useParticipant";
import { useProposalsPublic } from "@/hooks/useProposalsPublic";
import {
  VOTE_LABELS,
  type EventVoteChoice,
  type ParticipantProfile,
} from "@/lib/participants";
import { isFixed } from "@/lib/proposals";

type ToastState = { message: string; variant: ToastVariant } | null;

type Counts = {
  inParticipants: ParticipantProfile[];
  maybe: number;
  out: number;
};

export default function HomePage() {
  const {
    participant,
    isLoading: profileLoading,
    isSaving: profileSaving,
    loadError: profileLoadError,
    saveError: profileSaveError,
    saveProfile,
    isUpdatingAvatar,
    avatarError,
    updateAvatarUrl,
  } = useParticipant();

  const {
    proposals,
    votes,
    interests,
    participants,
    isLoading: proposalsLoading,
    loadError: proposalsLoadError,
    isConfigured,
    reload,
    voteOn,
    votingFor,
    voteError,
    setInterest,
    interestBusyFor,
    interestError,
  } = useProposalsPublic();

  const [openProposalId, setOpenProposalId] = useState<string | null>(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const participantsById = useMemo(() => {
    const map = new Map<string, ParticipantProfile>();
    for (const p of participants) map.set(p.id, p);
    if (participant && !map.has(participant.id)) {
      map.set(participant.id, participant);
    }
    return map;
  }, [participants, participant]);

  const countsByProposal = useMemo(() => {
    const result = new Map<string, Counts>();
    for (const proposal of proposals) {
      result.set(proposal.id, { inParticipants: [], maybe: 0, out: 0 });
    }
    for (const v of votes) {
      const bucket = result.get(v.proposal_id);
      if (!bucket) continue;
      if (v.vote === "in") {
        const p = participantsById.get(v.participant_id);
        if (p) bucket.inParticipants.push(p);
      } else if (v.vote === "maybe") {
        bucket.maybe += 1;
      } else {
        bucket.out += 1;
      }
    }
    return result;
  }, [proposals, votes, participantsById]);

  const myVoteByProposal = useMemo(() => {
    const map = new Map<string, EventVoteChoice>();
    if (!participant) return map;
    for (const v of votes) {
      if (v.participant_id === participant.id) {
        map.set(v.proposal_id, v.vote);
      }
    }
    return map;
  }, [votes, participant]);

  const interestByProposal = useMemo(() => {
    const map = new Map<string, ParticipantProfile[]>();
    for (const p of proposals) map.set(p.id, []);
    for (const i of interests) {
      const list = map.get(i.proposal_id);
      if (!list) continue;
      const profile = participantsById.get(i.participant_id);
      if (profile) list.push(profile);
    }
    return map;
  }, [interests, proposals, participantsById]);

  const myInterestSet = useMemo(() => {
    const set = new Set<string>();
    if (!participant) return set;
    for (const i of interests) {
      if (i.participant_id === participant.id) set.add(i.proposal_id);
    }
    return set;
  }, [interests, participant]);

  const interestCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const [proposalId, people] of interestByProposal.entries()) {
      map.set(proposalId, people.length);
    }
    return map;
  }, [interestByProposal]);

  const openProposal = useMemo(
    () => proposals.find((p) => p.id === openProposalId) ?? null,
    [proposals, openProposalId],
  );

  const handleProfileSubmit = useCallback(
    async (input: { display_name: string; hotel_info: string | null }) => {
      const result = await saveProfile(input);
      if (result) {
        setToast({
          message: "Profil gespeichert.",
          variant: "success",
        });
      } else {
        setToast({
          message:
            profileSaveError ||
            "Profil konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
          variant: "error",
        });
      }
    },
    [saveProfile, profileSaveError],
  );

  const handleAvatarUploaded = useCallback(
    async (publicUrl: string) => {
      const result = await updateAvatarUrl(publicUrl);
      if (result) {
        setToast({
          message: "Profilfoto aktualisiert.",
          variant: "success",
        });
      } else {
        setToast({
          message:
            avatarError ||
            "Profilfoto konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
          variant: "error",
        });
      }
    },
    [updateAvatarUrl, avatarError],
  );

  const handleVote = useCallback(
    async (proposalId: string, vote: EventVoteChoice) => {
      if (!participant) {
        setToast({
          message: "Bitte speichere zuerst deinen Namen.",
          variant: "error",
        });
        return;
      }
      const ok = await voteOn(proposalId, participant.id, vote);
      if (ok) {
        setToast({
          message: `Gespeichert: ${VOTE_LABELS[vote]}.`,
          variant: "success",
        });
      } else {
        setToast({
          message:
            voteError ||
            "Stimme konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
          variant: "error",
        });
      }
    },
    [participant, voteOn, voteError],
  );

  const handleToggleInterest = useCallback(
    async (proposalId: string) => {
      if (!participant) {
        setToast({
          message: "Bitte speichere zuerst deinen Namen.",
          variant: "error",
        });
        return;
      }
      const interested = !myInterestSet.has(proposalId);
      const ok = await setInterest(proposalId, participant.id, interested);
      if (ok) {
        setToast({
          message: interested
            ? "Interesse gemerkt."
            : "Interesse entfernt.",
          variant: "success",
        });
      } else {
        setToast({
          message:
            interestError ||
            "Interesse konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
          variant: "error",
        });
      }
    },
    [participant, myInterestSet, setInterest, interestError],
  );

  function handleOpenSuggest() {
    if (!participant) {
      setToast({
        message:
          "Bitte speichere zuerst deinen Namen, dann kannst du einen Vorschlag machen.",
        variant: "error",
      });
      return;
    }
    setIsSuggestOpen(true);
  }

  function handleSuggestSuccess() {
    setToast({
      message:
        "Danke! Dein Vorschlag wurde eingereicht und wartet auf Freigabe.",
      variant: "success",
    });
    void reload();
  }

  const canInteract = Boolean(participant) && isConfigured;

  const openInterested = openProposal
    ? (interestByProposal.get(openProposal.id) ?? [])
    : [];
  const openIsInterested =
    openProposal != null && myInterestSet.has(openProposal.id);
  const openIsFixed = openProposal ? isFixed(openProposal) : false;

  return (
    <main className="min-h-screen bg-stone-50">
      <HeroSection />

      {/* Profilbereich + Hinweise im normalen, schmalen Container. */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-12 sm:-mt-16 space-y-6 relative">
        {!isConfigured && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-soft">
            <p className="font-medium">Supabase ist noch nicht verbunden.</p>
            <p className="mt-1 text-amber-800/90">
              Bitte <code>NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in den
              Environment-Variablen setzen.
            </p>
          </div>
        )}

        <ProfileCard
          participant={participant}
          isLoading={profileLoading}
          isSaving={profileSaving}
          loadError={profileLoadError}
          saveError={profileSaveError}
          disabled={!isConfigured}
          onSubmit={handleProfileSubmit}
          isUpdatingAvatar={isUpdatingAvatar}
          avatarError={avatarError}
          onAvatarUploaded={handleAvatarUploaded}
        />

        {!participant && isConfigured && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Speichere zuerst deinen Namen, dann kannst du Interesse zeigen,
            abstimmen und eigene Ideen vorschlagen.
          </p>
        )}

        {proposalsLoadError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {proposalsLoadError}
          </div>
        )}

        {proposalsLoading && (
          <div className="flex items-center gap-2 rounded-3xl bg-white px-5 py-6 text-sm text-slate-600 shadow-soft">
            <Loader2 size={16} className="animate-spin" />
            Lade Vorschlaege...
          </div>
        )}
      </div>

      {/* Breite Discovery-Sektion: bewusst AUSSERHALB des max-w-3xl
          Containers. Eigener breiter Wrapper steckt in der Komponente. */}
      {!proposalsLoading && !proposalsLoadError && (
        <div className="mt-8 sm:mt-10">
          <ActivityDiscovery
            proposals={proposals}
            interestCounts={interestCounts}
            isInterested={(id) => myInterestSet.has(id)}
            interestBusyFor={interestBusyFor}
            onToggleInterest={(id) => void handleToggleInterest(id)}
            onOpenProposal={(id) => setOpenProposalId(id)}
            onSuggest={handleOpenSuggest}
            canInteract={canInteract}
          />
        </div>
      )}

      {/* Gruppenplan steuert seinen Container selbst -- die Wochenplan-
          Ansicht bricht aus dem schmalen max-w-3xl aus und nutzt eine
          eigene breite Buehne. Auf <lg bleibt Vertikal und schmal. */}
      {!proposalsLoading && !proposalsLoadError && (
        <div className="mt-8 sm:mt-10">
          <GroupPlan
            proposals={proposals}
            countsByProposal={countsByProposal}
            myVoteByProposal={myVoteByProposal}
            interestCounts={interestCounts}
            onOpenProposal={(id) => setOpenProposalId(id)}
          />
        </div>
      )}

      {/* Idee-Hinweis bleibt im schmalen Container. */}
      {!proposalsLoading && !proposalsLoadError && (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 mt-8 sm:mt-10 space-y-8 pb-16 relative">
          <section className="rounded-3xl border border-white bg-white px-5 py-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Eine eigene Idee?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Schlag etwas vor &ndash; nach kurzer Freigabe taucht es
                  bei &bdquo;Aktivitaeten entdecken&ldquo; auf.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenSuggest}
                disabled={!canInteract}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageSquarePlus size={16} />
                Idee vorschlagen
              </button>
            </div>
          </section>

          {votingFor && (
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
                <Loader2 size={12} className="animate-spin" />
                Speichere Stimme...
              </span>
            </div>
          )}

          <footer className="pt-4 text-center text-xs text-slate-400">
            Mallorca-Connect &middot; Alles kann, nichts muss.
          </footer>
        </div>
      )}

      {openProposal && (
        <ProposalDetail
          proposal={openProposal}
          votes={votes}
          participantsById={participantsById}
          currentParticipantId={participant?.id ?? null}
          isVoting={votingFor === openProposal.id}
          voteError={voteError}
          interestedParticipants={openInterested}
          isInterested={openIsInterested}
          isTogglingInterest={interestBusyFor === openProposal.id}
          interestError={interestError}
          onClose={() => setOpenProposalId(null)}
          onVote={handleVote}
          onToggleInterest={(id) => {
            // Interesse ist bei Pool- UND vorgemerkten Vorschlaegen
            // erlaubt. Erst wenn der Vorschlag "fix" ist, schaltet
            // das Modal auf das finale Voting um.
            if (!openIsFixed) void handleToggleInterest(id);
          }}
        />
      )}

      {isSuggestOpen && participant && (
        <SuggestProposalModal
          participantId={participant.id}
          onClose={() => setIsSuggestOpen(false)}
          onSuccess={handleSuggestSuccess}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
