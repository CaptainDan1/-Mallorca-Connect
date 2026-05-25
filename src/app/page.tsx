"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { ProfileCard } from "@/components/ProfileCard";
import { GroupPlan } from "@/components/GroupPlan";
import { ActivityPool } from "@/components/ActivityPool";
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
    participants,
    isLoading: proposalsLoading,
    loadError: proposalsLoadError,
    isConfigured,
    reload,
    voteOn,
    votingFor,
    voteError,
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

  const canSuggest = Boolean(participant) && isConfigured;

  return (
    <main className="min-h-screen bg-stone-50">
      <HeroSection />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-12 sm:-mt-16 pb-16 space-y-8 relative">
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

        {votingFor && (
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
              <Loader2 size={12} className="animate-spin" />
              Speichere Stimme...
            </span>
          </div>
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

        {!proposalsLoading && !proposalsLoadError && (
          <>
            <GroupPlan
              proposals={proposals}
              countsByProposal={countsByProposal}
              myVoteByProposal={myVoteByProposal}
              onOpenProposal={(id) => setOpenProposalId(id)}
            />

            {!participant && isConfigured && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                Speichere zuerst deinen Namen, dann kannst du abstimmen und
                eigene Ideen vorschlagen.
              </p>
            )}

            <ActivityPool
              proposals={proposals}
              countsByProposal={countsByProposal}
              myVoteByProposal={myVoteByProposal}
              onOpenProposal={(id) => setOpenProposalId(id)}
              onSuggest={handleOpenSuggest}
              canSuggest={canSuggest}
            />
          </>
        )}

        <footer className="pt-4 text-center text-xs text-slate-400">
          Mallorca-Connect &middot; Alles kann, nichts muss.
        </footer>
      </div>

      {openProposal && (
        <ProposalDetail
          proposal={openProposal}
          votes={votes}
          participantsById={participantsById}
          currentParticipantId={participant?.id ?? null}
          isVoting={votingFor === openProposal.id}
          voteError={voteError}
          onClose={() => setOpenProposalId(null)}
          onVote={handleVote}
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
