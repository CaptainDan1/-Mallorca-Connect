"use client";

import { CalendarRange } from "lucide-react";
import {
  PROPOSAL_SLOT_LABELS,
  PROPOSAL_SLOT_OPTIONS,
  TRIP_DAYS,
  formatTripDay,
  isScheduled,
  type EventProposal,
  type ProposalSlot,
} from "@/lib/proposals";
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

type GroupPlanProps = {
  proposals: EventProposal[];
  countsByProposal: Map<string, Counts>;
  myVoteByProposal: Map<string, EventVoteChoice>;
  onOpenProposal: (proposalId: string) => void;
};

export function GroupPlan({
  proposals,
  countsByProposal,
  myVoteByProposal,
  onOpenProposal,
}: GroupPlanProps) {
  const scheduled = proposals.filter(isScheduled);

  // Tag -> Slot -> Proposals
  const byDayAndSlot = new Map<string, Map<ProposalSlot, EventProposal[]>>();
  for (const day of TRIP_DAYS) {
    const slotMap = new Map<ProposalSlot, EventProposal[]>();
    for (const slot of PROPOSAL_SLOT_OPTIONS) {
      slotMap.set(slot, []);
    }
    byDayAndSlot.set(day, slotMap);
  }
  for (const p of scheduled) {
    if (!p.scheduled_day || !p.scheduled_slot) continue;
    const slotMap = byDayAndSlot.get(p.scheduled_day);
    if (!slotMap) continue;
    const list = slotMap.get(p.scheduled_slot);
    if (!list) continue;
    list.push(p);
  }

  // Innerhalb eines Slots nach event_start, dann sort_order, dann title.
  for (const slotMap of byDayAndSlot.values()) {
    for (const list of slotMap.values()) {
      list.sort((a, b) => {
        if (a.event_start && b.event_start) {
          return a.event_start.localeCompare(b.event_start);
        }
        if (a.event_start) return -1;
        if (b.event_start) return 1;
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.title.localeCompare(b.title, "de");
      });
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Unser Gruppenplan
          </h2>
          <p className="text-sm text-slate-600">
            Was sich pro Tag und Tageszeit zusammenfindet. Alles kann,
            nichts muss.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        {TRIP_DAYS.map((day) => {
          const slotMap = byDayAndSlot.get(day);
          if (!slotMap) return null;
          return (
            <article
              key={day}
              className="overflow-hidden rounded-3xl border border-white bg-white shadow-card"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
                  <CalendarRange size={16} />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Tag
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatTripDay(day)}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {PROPOSAL_SLOT_OPTIONS.map((slot) => {
                  const items = slotMap.get(slot) ?? [];
                  return (
                    <DaySlot
                      key={slot}
                      slot={slot}
                      proposals={items}
                      countsByProposal={countsByProposal}
                      myVoteByProposal={myVoteByProposal}
                      onOpenProposal={onOpenProposal}
                    />
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type DaySlotProps = {
  slot: ProposalSlot;
  proposals: EventProposal[];
  countsByProposal: Map<string, Counts>;
  myVoteByProposal: Map<string, EventVoteChoice>;
  onOpenProposal: (proposalId: string) => void;
};

function DaySlot({
  slot,
  proposals,
  countsByProposal,
  myVoteByProposal,
  onOpenProposal,
}: DaySlotProps) {
  const isEmpty = proposals.length === 0;

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-800">
          {PROPOSAL_SLOT_LABELS[slot]}
        </span>
        {!isEmpty && (
          <span className="text-xs text-slate-500">
            {proposals.length}{" "}
            {proposals.length === 1 ? "Idee" : "Ideen"}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-stone-50 px-4 py-4 text-center">
          <p className="text-sm text-slate-500">
            <span className="hidden sm:inline">Noch nichts geplant.</span>
            <span className="sm:hidden">Noch offen.</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {proposals.map((proposal) => {
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
                compact
                onOpen={() => onOpenProposal(proposal.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
