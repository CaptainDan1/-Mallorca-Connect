"use client";

import { CalendarClock, MapPin, Sparkles, Users } from "lucide-react";
import {
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  type EventProposal,
} from "@/lib/proposals";

type ProposalCardProps = {
  proposal: EventProposal;
  inCount: number;
  maybeCount: number;
  onOpen: () => void;
};

export function ProposalCard({
  proposal,
  inCount,
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

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            <Users size={12} />
            {inCount} dabei
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            {maybeCount} vielleicht
          </span>
          <span className="ml-auto text-xs font-medium text-sky-700 group-hover:text-sky-800">
            Details ansehen &rarr;
          </span>
        </div>
      </div>
    </button>
  );
}
