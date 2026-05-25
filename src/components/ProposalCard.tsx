"use client";

import {
  CalendarClock,
  Clock3,
  MapPin,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react";
import {
  LOCATION_AREA_BADGE,
  PROPOSAL_SLOT_LABELS,
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  formatTripDay,
  type EventProposal,
} from "@/lib/proposals";
import type {
  EventVoteChoice,
  ParticipantProfile,
} from "@/lib/participants";
import { ProposalAttendees } from "@/components/ProposalAttendees";

type ProposalCardProps = {
  proposal: EventProposal;
  inParticipants: ParticipantProfile[];
  maybeCount: number;
  outCount?: number;
  myVote?: EventVoteChoice | null;
  /** Kompakte Variante fuer den Gruppenplan (ohne grosses Bild). */
  compact?: boolean;
  /** Zeigt im Pool zusaetzlich ein kleines "Noch nicht eingeplant"-Label. */
  showPoolBadge?: boolean;
  /** Im Slot vorgemerkt, aber noch nicht fix. Karte erscheint entsaettigt
   *  und ohne Teilnahme-Indikatoren. */
  tentative?: boolean;
  /** Zaehler "X interessiert" fuer den Tentative-Modus. */
  interestCount?: number;
  onOpen: () => void;
};

export function ProposalCard({
  proposal,
  inParticipants,
  maybeCount,
  outCount = 0,
  myVote = null,
  compact = false,
  showPoolBadge = false,
  tentative = false,
  interestCount = 0,
  onOpen,
}: ProposalCardProps) {
  const eventDate = formatProposalDate(proposal.event_start);
  const hasImage = Boolean(proposal.image_path);

  const inCount = inParticipants.length;
  const min = proposal.min_participants ?? null;
  const max = proposal.capacity ?? null;
  const groupHint = computeGroupHint(inCount, min, max);

  const personalStatus = describePersonalStatus(myVote);

  const wrapperClass =
    "group block w-full overflow-hidden rounded-3xl border text-left shadow-card transition focus:outline-none focus:ring-2 focus:ring-sky-300 " +
    (tentative
      ? "border-slate-200 bg-stone-50/80 [filter:grayscale(85%)] opacity-90 hover:opacity-100 hover:[filter:grayscale(35%)]"
      : "border-white bg-white hover:border-sky-200 hover:shadow-lg");

  return (
    <button type="button" onClick={onOpen} className={wrapperClass}>
      {!compact && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-200 via-orange-200 to-sky-200">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proposal.image_path as string}
              alt={proposal.title}
              className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/90">
              <Sparkles size={44} className="drop-shadow" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur ${PROPOSAL_STATUS_BADGE[proposal.status]}`}
            >
              {PROPOSAL_STATUS_LABELS[proposal.status]}
            </span>
            {showPoolBadge && (
              <span className="inline-flex items-center rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur">
                Noch nicht eingeplant
              </span>
            )}
          </div>
        </div>
      )}

      <div className={compact ? "space-y-2.5 p-4" : "space-y-3 p-5"}>
        {compact && (
          <div className="flex flex-wrap items-center gap-2">
            {tentative ? (
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Vorgemerkt
              </span>
            ) : (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${PROPOSAL_STATUS_BADGE[proposal.status]}`}
              >
                {PROPOSAL_STATUS_LABELS[proposal.status]}
              </span>
            )}
            {proposal.scheduled_slot && (
              <span
                className={
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                  (tentative
                    ? "border-slate-200 bg-white text-slate-600"
                    : "border-sky-200 bg-sky-50 text-sky-800")
                }
              >
                {PROPOSAL_SLOT_LABELS[proposal.scheduled_slot]}
              </span>
            )}
          </div>
        )}

        <div>
          <h3
            className={
              compact
                ? "text-base font-semibold tracking-tight text-slate-900"
                : "text-lg font-semibold tracking-tight text-slate-900"
            }
          >
            {proposal.title}
          </h3>
          {proposal.short_description && (
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">
              {proposal.short_description}
            </p>
          )}
        </div>

        {(proposal.location_area || proposal.category) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {proposal.location_area && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${LOCATION_AREA_BADGE[proposal.location_area] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}
              >
                {proposal.location_area}
              </span>
            )}
            {proposal.category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {proposal.category}
              </span>
            )}
          </div>
        )}

        {(eventDate || proposal.meeting_point) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {eventDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={14} />
                {eventDate}
              </span>
            )}
            {proposal.meeting_point && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} />
                {proposal.meeting_point}
              </span>
            )}
            {compact && proposal.scheduled_day && !eventDate && (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={14} />
                {formatTripDay(proposal.scheduled_day)}
              </span>
            )}
          </div>
        )}

        {proposal.plan_note && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
            <StickyNote size={14} className="mt-0.5 shrink-0" />
            <span>{proposal.plan_note}</span>
          </p>
        )}

        <div className="pt-1">
          {tentative ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  <span>
                    <span className="font-semibold text-slate-700">
                      {interestCount}
                    </span>{" "}
                    interessiert
                  </span>
                </span>
                <span className="font-medium text-slate-600 group-hover:text-slate-800">
                  Details &rarr;
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Noch nicht final &ndash; wird fix, wenn genug Interesse
                zusammenkommt.
              </p>
            </>
          ) : (
            <>
              <ProposalAttendees
                participants={inParticipants}
                maxAvatars={compact ? 3 : 4}
                size="sm"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  <span>
                    <span className="font-semibold text-slate-700">
                      {inCount}
                    </span>{" "}
                    dabei
                    {maybeCount > 0 && (
                      <>
                        {" · "}
                        <span className="font-medium text-slate-700">
                          {maybeCount}
                        </span>{" "}
                        vielleicht
                      </>
                    )}
                    {outCount > 0 && (
                      <>
                        {" · "}
                        <span className="font-medium text-slate-500">
                          {outCount}
                        </span>{" "}
                        raus
                      </>
                    )}
                  </span>
                </span>
                <span className="font-medium text-sky-700 group-hover:text-sky-800">
                  Details &rarr;
                </span>
              </div>

              {(groupHint || personalStatus) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {groupHint && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${groupHint.className}`}
                    >
                      {groupHint.text}
                    </span>
                  )}
                  {personalStatus && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${personalStatus.className}`}
                    >
                      {personalStatus.text}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

type GroupHint = { text: string; className: string };

function computeGroupHint(
  inCount: number,
  min: number | null,
  max: number | null,
): GroupHint | null {
  if (min != null && inCount < min) {
    const missing = min - inCount;
    return {
      text: `Braucht noch ${missing} ${missing === 1 ? "Person" : "Personen"}`,
      className: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    };
  }
  if (max != null && inCount > max) {
    return {
      text: "Viele dabei – eventuell aufteilen",
      className: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
    };
  }
  if ((min != null && inCount >= min) || (max != null && inCount > 0)) {
    return {
      text: "Gute Gruppengroesse",
      className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
    };
  }
  return null;
}

type PersonalStatus = { text: string; className: string };

function describePersonalStatus(
  myVote: EventVoteChoice | null,
): PersonalStatus | null {
  if (myVote === "in") {
    return {
      text: "Du bist dabei",
      className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
    };
  }
  if (myVote === "maybe") {
    return {
      text: "Du bist vielleicht dabei",
      className: "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
    };
  }
  if (myVote === "out") {
    return {
      text: "Ohne dich",
      className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    };
  }
  return null;
}
