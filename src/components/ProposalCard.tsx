"use client";

import { CalendarClock, MapPin, Sparkles } from "lucide-react";
import {
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  type EventProposal,
} from "@/lib/proposals";
import type { ParticipantProfile } from "@/lib/participants";
import { ProposalAttendees } from "@/components/ProposalAttendees";

type ProposalCardProps = {
  proposal: EventProposal;
  inParticipants: ParticipantProfile[];
  maybeCount: number;
  onOpen: () => void;
};

export function ProposalCard({
  proposal,
  inParticipants,
  maybeCount,
  onOpen,
}: ProposalCardProps) {
  const eventDate = formatProposalDate(proposal.event_start);
  const hasImage = Boolean(proposal.image_path);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-3xl border border-white bg-white text-left shadow-card transition hover:border-sky-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
    >
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-amber-200 via-orange-200 to-sky-200 sm:h-48">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proposal.image_path as string}
            alt={proposal.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/90">
            <Sparkles size={44} className="drop-shadow" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur ${PROPOSAL_STATUS_BADGE[proposal.status]}`}
          >
            {PROPOSAL_STATUS_LABELS[proposal.status]}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            {proposal.title}
          </h3>
          {proposal.short_description && (
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">
              {proposal.short_description}
            </p>
          )}
        </div>

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
          </div>
        )}

        <div className="pt-1">
          <ProposalAttendees
            participants={inParticipants}
            maxAvatars={4}
            size="sm"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {maybeCount > 0
                ? `+ ${maybeCount} vielleicht`
                : "Keine vielleicht-Stimmen"}
            </span>
            <span className="font-medium text-sky-700 group-hover:text-sky-800">
              Details ansehen &rarr;
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
