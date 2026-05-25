"use client";

import { useEffect, useMemo } from "react";
import {
  CalendarClock,
  CalendarRange,
  Coins,
  Heart,
  Hourglass,
  Loader2,
  MapPin,
  Sparkles,
  StickyNote,
  Sun,
  Users,
  X,
} from "lucide-react";
import {
  LOCATION_AREA_BADGE,
  PROPOSAL_SLOT_LABELS,
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  formatTripDay,
  isFixed,
  isScheduled,
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
import { ProposalAttendees } from "@/components/ProposalAttendees";

type ProposalDetailProps = {
  proposal: EventProposal;
  votes: EventVote[];
  participantsById: Map<string, ParticipantProfile>;
  currentParticipantId: string | null;
  isVoting: boolean;
  voteError: string | null;
  interestedParticipants: ParticipantProfile[];
  isInterested: boolean;
  isTogglingInterest: boolean;
  interestError: string | null;
  onClose: () => void;
  onVote: (proposalId: string, vote: EventVoteChoice) => Promise<void> | void;
  onToggleInterest: (proposalId: string) => Promise<void> | void;
};

export function ProposalDetail({
  proposal,
  votes,
  participantsById,
  currentParticipantId,
  isVoting,
  voteError,
  interestedParticipants,
  isInterested,
  isTogglingInterest,
  interestError,
  onClose,
  onVote,
  onToggleInterest,
}: ProposalDetailProps) {
  const eventDate = formatProposalDate(proposal.event_start);
  const scheduled = isScheduled(proposal);
  const fixed = isFixed(proposal);
  // Tentative: bereits im Slot, aber noch nicht final.
  const tentative = scheduled && !fixed;

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

  const inParticipants = useMemo(() => {
    return grouped.in
      .map((v) => participantsById.get(v.participant_id))
      .filter((p): p is ParticipantProfile => Boolean(p));
  }, [grouped.in, participantsById]);

  const maybeParticipants = useMemo(() => {
    return grouped.maybe
      .map((v) => participantsById.get(v.participant_id))
      .filter((p): p is ParticipantProfile => Boolean(p));
  }, [grouped.maybe, participantsById]);

  const outParticipants = useMemo(() => {
    return grouped.out
      .map((v) => participantsById.get(v.participant_id))
      .filter((p): p is ParticipantProfile => Boolean(p));
  }, [grouped.out, participantsById]);

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
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-200 via-orange-200 to-sky-200">
          {proposal.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proposal.image_path}
              alt={proposal.title}
              className="h-full w-full object-cover object-center"
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
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            {fixed ? (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${PROPOSAL_STATUS_BADGE[proposal.status]}`}
              >
                {PROPOSAL_STATUS_LABELS[proposal.status]}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur">
                {tentative ? "Vorgemerkt" : "Noch nicht eingeplant"}
              </span>
            )}
            {scheduled && (
              <span
                className={
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur " +
                  (fixed
                    ? "bg-white/85 text-sky-800"
                    : "bg-white/85 text-slate-600")
                }
              >
                <CalendarRange size={12} />
                {formatTripDay(proposal.scheduled_day as string)}
                {" · "}
                {
                  PROPOSAL_SLOT_LABELS[
                    proposal.scheduled_slot as
                      | "morning"
                      | "afternoon"
                      | "evening"
                  ]
                }
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 space-y-5">
          <header>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {proposal.title}
            </h2>
            {(proposal.location_area || proposal.category) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {proposal.location_area && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${LOCATION_AREA_BADGE[proposal.location_area] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}
                  >
                    {proposal.location_area}
                  </span>
                )}
                {proposal.category && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {proposal.category}
                  </span>
                )}
              </div>
            )}
            {proposal.short_description && (
              <p className="mt-2 text-sm text-slate-600">
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

          {proposal.plan_note && (
            <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
              <StickyNote size={16} className="mt-0.5 shrink-0" />
              <span>{proposal.plan_note}</span>
            </p>
          )}

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

          {proposal.source_url && (
            <p className="text-xs text-slate-500">
              Quelle:{" "}
              <a
                href={proposal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-700 underline hover:text-sky-800"
              >
                {prettyHost(proposal.source_url)}
              </a>
            </p>
          )}

          {fixed ? (
            <>
              <section className="rounded-2xl bg-emerald-50 px-4 py-4 ring-1 ring-emerald-200">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-900">
                  <Users size={14} />
                  Wer ist dabei?
                </h3>
                <ProposalAttendees
                  participants={inParticipants}
                  maxAvatars={8}
                  size="lg"
                  emptyText="Noch niemand dabei. Mach den Anfang."
                />
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SmallBucket
                  title="Vielleicht"
                  tone="amber"
                  participants={maybeParticipants}
                />
                <SmallBucket
                  title="Bin raus"
                  tone="slate"
                  participants={outParticipants}
                />
              </div>
            </>
          ) : (
            <section className="rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-900">
                <Sun size={14} />
                Wer ist interessiert?
              </h3>
              <div className="mb-3 space-y-1 text-sm text-amber-900/85">
                <p className="font-medium">
                  {tentative
                    ? "Slot ist vorgemerkt, aber noch nicht fix."
                    : "Noch nicht fest eingeplant."}
                </p>
                <p>
                  Zeig Interesse, damit wir sehen, ob sich eine Gruppe lohnt.
                </p>
                <p className="text-amber-900/70">
                  Eine verbindliche Teilnahme gibt es erst, wenn ein Zeitpunkt
                  feststeht.
                </p>
              </div>
              <ProposalAttendees
                participants={interestedParticipants}
                maxAvatars={8}
                size="lg"
                mode="interested"
                emptyText="Noch niemand interessiert. Mach den Anfang."
              />
            </section>
          )}
        </div>

        <footer className="border-t border-slate-100 bg-stone-50 px-5 py-4 sm:px-7">
          {!currentParticipantId ? (
            <p className="text-sm text-slate-600">
              Bitte speichere zuerst deinen Namen, um{" "}
              {fixed ? "abzustimmen" : "Interesse zu zeigen"}.
            </p>
          ) : fixed ? (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Deine Teilnahme gilt fuer diesen geplanten Zeitraum.
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
          ) : (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                {tentative
                  ? "Zeit und Slot werden noch abgestimmt. Zeig solange Interesse – das finale Voting kommt, sobald es fix ist."
                  : "Zeig Interesse, damit der Admin sieht, ob sich eine Gruppe lohnt."}
              </p>
              <button
                type="button"
                onClick={() => onToggleInterest(proposal.id)}
                disabled={isTogglingInterest}
                aria-pressed={isInterested}
                className={
                  "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 " +
                  (isInterested
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-soft hover:from-rose-500 hover:to-pink-600"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")
                }
              >
                {isTogglingInterest ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Heart
                    size={14}
                    className={isInterested ? "fill-current" : ""}
                  />
                )}
                {isInterested ? "Interesse gemerkt" : "Interessiert"}
              </button>
              {interestError && (
                <p className="mt-3 text-sm text-rose-700">{interestError}</p>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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

function SmallBucket({
  title,
  tone,
  participants,
}: {
  title: string;
  tone: "amber" | "slate";
  participants: ParticipantProfile[];
}) {
  const toneClasses =
    tone === "amber"
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${toneClasses}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide">
          {title}
        </p>
        <span className="text-xs font-medium opacity-80">
          {participants.length}
        </span>
      </div>
      {participants.length === 0 ? (
        <p className="text-xs opacity-70">Noch niemand.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const gradient = avatarGradient(p.display_name);
            return (
              <li
                key={p.id}
                className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-0.5 ring-1 ring-black/5"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${gradient} text-[9px] font-semibold text-white`}
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={p.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(p.display_name)
                  )}
                </span>
                <span className="text-xs font-medium text-slate-800">
                  {p.display_name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
