"use client";

import { MessageSquarePlus, Sparkles } from "lucide-react";
import { isScheduled, type EventProposal } from "@/lib/proposals";
import type {
  EventVoteChoice,
  ParticipantProfile,
} from "@/lib/participants";
import { ProposalCard } from "@/components/ProposalCard";

type Counts = {
  inParticipants: ParticipantProfile[];
  maybe: number;
  out: number;
};

type ActivityPoolProps = {
  proposals: EventProposal[];
  countsByProposal: Map<string, Counts>;
  myVoteByProposal: Map<string, EventVoteChoice>;
  onOpenProposal: (proposalId: string) => void;
  onSuggest: () => void;
  canSuggest: boolean;
};

export function ActivityPool({
  proposals,
  countsByProposal,
  myVoteByProposal,
  onOpenProposal,
  onSuggest,
  canSuggest,
}: ActivityPoolProps) {
  const open = proposals.filter((p) => !isScheduled(p));
  // Sortierung im Pool: zuerst nach sort_order, dann nach Titel.
  const sorted = [...open].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title, "de");
  });

  const isEmpty = sorted.length === 0;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Aktivitaetspool
          </h2>
          <p className="text-sm text-slate-600">
            Ideen, die noch nicht fest eingeplant sind.
          </p>
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={!canSuggest}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageSquarePlus size={16} />
          Eigene Idee vorschlagen
        </button>
      </header>

      {isEmpty ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-soft">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
            <Sparkles size={20} />
          </div>
          <p className="text-base font-medium text-slate-700">
            Noch keine offenen Ideen im Pool.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Mach den ersten Vorschlag fuer die Crew.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((proposal) => {
            const c =
              countsByProposal.get(proposal.id) ?? {
                inParticipants: [],
                maybe: 0,
                out: 0,
              };
            return (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                inParticipants={c.inParticipants}
                maybeCount={c.maybe}
                outCount={c.out}
                myVote={myVoteByProposal.get(proposal.id) ?? null}
                showPoolBadge
                onOpen={() => onOpenProposal(proposal.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
