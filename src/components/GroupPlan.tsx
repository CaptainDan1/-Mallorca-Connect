"use client";

import { CalendarRange } from "lucide-react";
import {
  PROPOSAL_SLOT_LABELS,
  PROPOSAL_SLOT_OPTIONS,
  TRIP_DAYS,
  formatTripDay,
  isFixed,
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
  interestCounts: Map<string, number>;
  onOpenProposal: (proposalId: string) => void;
};

export function GroupPlan({
  proposals,
  countsByProposal,
  myVoteByProposal,
  interestCounts,
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

  // Innerhalb eines Slots: fixe Events zuerst, dann vorgemerkte;
  // gleich-priorisiert weiter nach event_start, sort_order, title.
  for (const slotMap of byDayAndSlot.values()) {
    for (const list of slotMap.values()) {
      list.sort((a, b) => {
        const aFixed = isFixed(a) ? 0 : 1;
        const bFixed = isFixed(b) ? 0 : 1;
        if (aFixed !== bFixed) return aFixed - bFixed;
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
            Was sich pro Tag und Tageszeit zusammenfindet. Vorgemerktes
            erscheint gedaempft, Fixes farbig &ndash; erst dort gibt&apos;s die
            finale Abstimmung.
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
                      interestCounts={interestCounts}
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
  interestCounts: Map<string, number>;
  onOpenProposal: (proposalId: string) => void;
};

function DaySlot({
  slot,
  proposals,
  countsByProposal,
  myVoteByProposal,
  interestCounts,
  onOpenProposal,
}: DaySlotProps) {
  const isEmpty = proposals.length === 0;
  const fixedCount = proposals.filter(isFixed).length;
  const tentativeCount = proposals.length - fixedCount;

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-800">
          {PROPOSAL_SLOT_LABELS[slot]}
        </span>
        {!isEmpty && (
          <span className="text-xs text-slate-500">
            {fixedCount > 0 && (
              <span className="font-medium text-emerald-700">
                {fixedCount} fix
              </span>
            )}
            {fixedCount > 0 && tentativeCount > 0 && " · "}
            {tentativeCount > 0 && (
              <span>{tentativeCount} vorgemerkt</span>
            )}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-stone-50/70 px-4 py-5 text-center">
          <p className="text-sm font-medium text-slate-500">
            <span className="hidden sm:inline">Noch nichts geplant.</span>
            <span className="sm:hidden">Noch offen.</span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Sobald sich Interesse zeigt, kann hier etwas vorgemerkt werden.
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
            const tentative = !isFixed(proposal);
            return (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                inParticipants={c.inParticipants}
                maybeCount={c.maybe}
                outCount={c.out}
                myVote={
                  tentative
                    ? null
                    : (myVoteByProposal.get(proposal.id) ?? null)
                }
                tentative={tentative}
                interestCount={interestCounts.get(proposal.id) ?? 0}
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
