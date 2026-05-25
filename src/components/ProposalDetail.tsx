"use client";

import { useEffect, useMemo } from "react";
import {
  CalendarClock,
  Coins,
  Hourglass,
  Loader2,
  MapPin,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  type EventProposal,
} from "@/lib/proposals";
import {
  VOTE_LABELS,
  VOTE_OPTIONS,
  type EventVote,
  type EventVoteChoice,
  type ParticipantProfile,
} from "@/lib/participants";
import { avatarGradient, getInitials } from "@/lib/utils";

type ProposalDetailProps = {
  proposal: EventProposal;
  votes: EventVote[];
  participantsById: Map<string, ParticipantProfile>;
  currentParticipantId: string | null;
  isVoting: boolean;
  voteError: string | null;
  onClose: () => void;
  onVote: (proposalId: string, vote: EventVoteChoice) => Promise<void> | void;
};

export function ProposalDetail({
  proposal,
  votes,
  participantsById,
  currentParticipantId,
  isVoting,
  voteError,
  onClose,
  onVote,
}: ProposalDetailProps) {
  const eventDate = formatProposalDate(proposal.event_start);

  // ESC schliesst.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const grouped = useMemo(() => {
    const result: Record<EventVoteChoice, EventVote[]> = {
      in: [],
      maybe: [],
      out: [],
    };
    for (const v of votes) {
      if (v.proposal_id === proposal.id) {
        result[v.vote].push(v);
      }
    }
    return result;
  }, [votes, proposal.id]);

  const myVote = useMemo<EventVoteChoice | null>(() => {
    if (!currentParticipantId) return null;
    const own = votes.find(
      (v) =>
        v.proposal_id === proposal.id &&
        v.participant_id === currentParticipantId,
    );
    return own?.vote ?? null;
  }, [votes, proposal.id, currentParticipantId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={proposal.title}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl">
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-amber-200 via-orange-200 to-sky-200 sm:h-56">
          {proposal.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proposal.image_path}
              alt={proposal.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/90">
              <Sparkles size={56} className="drop-shadow" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-soft transition hover:bg-white"
            aria-label="Schliessen"
          >
            <X size={18} />
          </button>
          <div className="absolute left-3 top-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${PROPOSAL_STATUS_BADGE[proposal.status]}`}
            >
              {PROPOSAL_STATUS_LABELS[proposal.status]}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 space-y-5">
          <header>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {proposal.title}
            </h2>
            {proposal.short_description && (
              <p className="mt-1 text-sm text-slate-600">
                {proposal.short_description}
              </p>
            )}
          </header>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {eventDate && (
              <InfoRow icon={<CalendarClock size={16} />} label="Wann">
                {eventDate}
              </InfoRow>
            )}
            {proposal.meeting_point && (
              <InfoRow icon={<MapPin size={16} />} label="Treffpunkt">
                {proposal.meeting_point}
              </InfoRow>
            )}
            {proposal.duration && (
              <InfoRow icon={<Hourglass size={16} />} label="Dauer">
                {proposal.duration}
              </InfoRow>
            )}
            {proposal.cost_note && (
              <InfoRow icon={<Coins size={16} />} label="Kosten / Hinweis">
                {proposal.cost_note}
              </InfoRow>
            )}
          </dl>

          {proposal.long_description && (
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Details
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {proposal.long_description}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Users size={14} />
              Wer ist dabei?
            </h3>
            <div className="space-y-4">
              <VoteBucket
                title="Bin dabei"
                tone="emerald"
                votes={grouped.in}
                participantsById={participantsById}
              />
              <VoteBucket
                title="Vielleicht"
                tone="amber"
                votes={grouped.maybe}
                participantsById={participantsById}
              />
              <VoteBucket
                title="Bin raus"
                tone="slate"
                votes={grouped.out}
                participantsById={participantsById}
              />
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-100 bg-stone-50 px-5 py-4 sm:px-7">
          {!currentParticipantId ? (
            <p className="text-sm text-slate-600">
              Bitte speichere zuerst deinen Namen, um abzustimmen.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Deine Stimme
              </p>
              <div className="grid grid-cols-3 gap-2">
                {VOTE_OPTIONS.map((option) => {
                  const isActive = myVote === option;
                  const baseTone =
                    option === "in"
                      ? "from-emerald-500 to-teal-500 ring-emerald-200"
                      : option === "maybe"
                        ? "from-amber-500 to-orange-500 ring-amber-200"
                        : "from-slate-500 to-slate-600 ring-slate-200";
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onVote(proposal.id, option)}
                      disabled={isVoting}
                      className={
                        "flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 " +
                        (isActive
                          ? `bg-gradient-to-r text-white shadow-soft ring-2 ${baseTone}`
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")
                      }
                    >
                      {isVoting && isActive ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      {VOTE_LABELS[option]}
                    </button>
                  );
                })}
              </div>
              {voteError && (
                <p className="mt-3 text-sm text-rose-700">{voteError}</p>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-stone-50 px-3 py-2.5">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="text-sm text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

function VoteBucket({
  title,
  tone,
  votes,
  participantsById,
}: {
  title: string;
  tone: "emerald" | "amber" | "slate";
  votes: EventVote[];
  participantsById: Map<string, ParticipantProfile>;
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${toneClasses}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-xs font-medium opacity-80">
          {votes.length}
        </span>
      </div>
      {votes.length === 0 ? (
        <p className="text-xs opacity-70">Noch niemand.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {votes.map((v) => {
            const p = participantsById.get(v.participant_id);
            const name = p?.display_name ?? "Unbekannt";
            const gradient = avatarGradient(name);
            const avatarUrl = p?.avatar_url ?? null;
            return (
              <li
                key={v.id}
                className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${gradient} text-[10px] font-semibold text-white`}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(name)
                  )}
                </span>
                <span className="text-xs font-medium text-slate-800">
                  {name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
