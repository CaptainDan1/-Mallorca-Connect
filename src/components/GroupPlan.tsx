"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, LayoutGrid, Rows3, Users } from "lucide-react";
import {
  PROPOSAL_SLOT_LABELS,
  PROPOSAL_SLOT_OPTIONS,
  PROPOSAL_STATUS_LABELS,
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

type ViewMode = "vertical" | "weekly";

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
  // SSR-sicher mit "vertical" starten, damit Mobile-First keine Hydration-
  // Mismatches verursacht. Nach Mount auf "weekly" hochschalten, sobald wir
  // sicher wissen, dass wir auf Desktop sind. Bewusst kein localStorage --
  // der Auftrag verlangt explizit keine Speicherung.
  const [viewMode, setViewMode] = useState<ViewMode>("vertical");
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches) {
      setViewMode((current) => (current === "vertical" ? "weekly" : current));
    }
  }, []);

  // Vorberechnung Tag -> Slot -> Proposals einmal teilen; beide Ansichten
  // nutzen dieselbe Datenquelle (`scheduled_day`, `scheduled_slot`).
  const byDayAndSlot = useMemo(() => {
    const map = new Map<string, Map<ProposalSlot, EventProposal[]>>();
    for (const day of TRIP_DAYS) {
      const slotMap = new Map<ProposalSlot, EventProposal[]>();
      for (const slot of PROPOSAL_SLOT_OPTIONS) {
        slotMap.set(slot, []);
      }
      map.set(day, slotMap);
    }
    for (const p of proposals) {
      if (!isScheduled(p)) continue;
      if (!p.scheduled_day || !p.scheduled_slot) continue;
      const slotMap = map.get(p.scheduled_day);
      if (!slotMap) continue;
      const list = slotMap.get(p.scheduled_slot);
      if (!list) continue;
      list.push(p);
    }
    // Innerhalb eines Slots: fixe Events zuerst, dann vorgemerkte;
    // weiter nach event_start, sort_order, title.
    for (const slotMap of map.values()) {
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
    return map;
  }, [proposals]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Unser Gruppenplan
          </h2>
          <p className="text-sm text-slate-600">
            Was sich pro Tag und Tageszeit zusammenfindet. Vorgemerktes
            erscheint gedaempft, Fixes farbig &ndash; erst dort gibt&apos;s die
            finale Abstimmung.
          </p>
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </header>

      {viewMode === "vertical" ? (
        <VerticalPlan
          byDayAndSlot={byDayAndSlot}
          countsByProposal={countsByProposal}
          myVoteByProposal={myVoteByProposal}
          interestCounts={interestCounts}
          onOpenProposal={onOpenProposal}
        />
      ) : (
        <WeeklyPlan
          byDayAndSlot={byDayAndSlot}
          countsByProposal={countsByProposal}
          myVoteByProposal={myVoteByProposal}
          interestCounts={interestCounts}
          onOpenProposal={onOpenProposal}
        />
      )}
    </section>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const baseBtn =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-300";
  return (
    <div
      role="tablist"
      aria-label="Ansicht waehlen"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-soft"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "vertical"}
        onClick={() => onChange("vertical")}
        className={
          baseBtn +
          (value === "vertical"
            ? " bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-soft"
            : " text-slate-600 hover:bg-slate-50")
        }
      >
        <Rows3 size={13} />
        Vertikal
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "weekly"}
        onClick={() => onChange("weekly")}
        className={
          baseBtn +
          (value === "weekly"
            ? " bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-soft"
            : " text-slate-600 hover:bg-slate-50")
        }
      >
        <LayoutGrid size={13} />
        Wochenplan
      </button>
    </div>
  );
}

// --- Vertikal: vorhandene Darstellung, Tage untereinander -----------------

type SharedPlanProps = {
  byDayAndSlot: Map<string, Map<ProposalSlot, EventProposal[]>>;
  countsByProposal: Map<string, Counts>;
  myVoteByProposal: Map<string, EventVoteChoice>;
  interestCounts: Map<string, number>;
  onOpenProposal: (proposalId: string) => void;
};

function VerticalPlan({
  byDayAndSlot,
  countsByProposal,
  myVoteByProposal,
  interestCounts,
  onOpenProposal,
}: SharedPlanProps) {
  return (
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

// --- Wochenplan: Stundenplan-Style, Tage als Spalten ----------------------

function WeeklyPlan({
  byDayAndSlot,
  countsByProposal,
  myVoteByProposal,
  interestCounts,
  onOpenProposal,
}: SharedPlanProps) {
  // Spaltenanzahl == TRIP_DAYS.length (5 heute, ggf. spaeter 7).
  // Auf schmalen Bildschirmen darf horizontal gescrollt werden.
  // `min-w` so waehlen, dass Tageskarten lesbar bleiben.
  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${TRIP_DAYS.length}, minmax(220px, 1fr))`,
        }}
      >
        {TRIP_DAYS.map((day) => {
          const slotMap = byDayAndSlot.get(day);
          if (!slotMap) return null;
          return (
            <article
              key={day}
              className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-white bg-white shadow-card"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
                  <CalendarRange size={12} />
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {formatTripDay(day)}
                </p>
              </div>

              <div className="flex flex-1 flex-col divide-y divide-slate-100">
                {PROPOSAL_SLOT_OPTIONS.map((slot) => (
                  <WeeklySlotCell
                    key={slot}
                    slot={slot}
                    proposals={slotMap.get(slot) ?? []}
                    countsByProposal={countsByProposal}
                    myVoteByProposal={myVoteByProposal}
                    interestCounts={interestCounts}
                    onOpenProposal={onOpenProposal}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type WeeklySlotCellProps = {
  slot: ProposalSlot;
  proposals: EventProposal[];
  countsByProposal: Map<string, Counts>;
  myVoteByProposal: Map<string, EventVoteChoice>;
  interestCounts: Map<string, number>;
  onOpenProposal: (proposalId: string) => void;
};

function WeeklySlotCell({
  slot,
  proposals,
  countsByProposal,
  myVoteByProposal,
  interestCounts,
  onOpenProposal,
}: WeeklySlotCellProps) {
  const isEmpty = proposals.length === 0;
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <span className="inline-flex w-fit items-center rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
        {PROPOSAL_SLOT_LABELS[slot]}
      </span>
      {isEmpty ? (
        <div className="flex min-h-[60px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-stone-50/70 px-2 py-2 text-center">
          <p className="text-[11px] font-medium text-slate-400">Noch offen</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {proposals.map((proposal) => {
            const c =
              countsByProposal.get(proposal.id) ?? {
                inParticipants: [],
                maybe: 0,
                out: 0,
              };
            const tentative = !isFixed(proposal);
            const myVote = tentative
              ? null
              : (myVoteByProposal.get(proposal.id) ?? null);
            return (
              <li key={proposal.id}>
                <WeeklyMiniCard
                  proposal={proposal}
                  inCount={c.inParticipants.length}
                  maybeCount={c.maybe}
                  tentative={tentative}
                  interestCount={interestCounts.get(proposal.id) ?? 0}
                  myVote={myVote}
                  onOpen={() => onOpenProposal(proposal.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type WeeklyMiniCardProps = {
  proposal: EventProposal;
  inCount: number;
  maybeCount: number;
  tentative: boolean;
  interestCount: number;
  myVote: EventVoteChoice | null;
  onOpen: () => void;
};

// Kompaktere Karte als die normale ProposalCard -- in einer 220px-Spalte
// muss Platz fuer 1-3 Aktivitaeten pro Slot bleiben. Vorgemerkte sind
// gedaempft / nahezu schwarz-weiss, fixe sind farbig.
function WeeklyMiniCard({
  proposal,
  inCount,
  maybeCount,
  tentative,
  interestCount,
  myVote,
  onOpen,
}: WeeklyMiniCardProps) {
  const baseClass =
    "group flex w-full flex-col gap-1.5 rounded-2xl border px-2.5 py-2 text-left shadow-soft transition focus:outline-none focus:ring-2 focus:ring-sky-300 active:scale-[0.99]";
  const tentativeClass =
    "border-slate-200 bg-stone-50/80 [filter:grayscale(85%)] opacity-90 hover:opacity-100 hover:[filter:grayscale(35%)]";
  const fixedClass = "border-white bg-white hover:border-sky-200 hover:shadow";

  const myVoteBadge =
    !tentative && myVote
      ? myVote === "in"
        ? {
            text: "Du dabei",
            className: "bg-emerald-50 text-emerald-800 ring-emerald-100",
          }
        : myVote === "maybe"
          ? {
              text: "Vielleicht",
              className: "bg-amber-50 text-amber-900 ring-amber-100",
            }
          : {
              text: "Ohne dich",
              className: "bg-slate-100 text-slate-600 ring-slate-200",
            }
      : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${baseClass} ${tentative ? tentativeClass : fixedClass}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <h4 className="line-clamp-2 text-[12px] font-semibold leading-snug text-slate-900">
          {proposal.title}
        </h4>
        <span
          className={
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide " +
            (tentative
              ? "bg-slate-200 text-slate-600"
              : "bg-emerald-100 text-emerald-800")
          }
        >
          {tentative ? "Vorgemerkt" : PROPOSAL_STATUS_LABELS[proposal.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
        {tentative ? (
          <span className="inline-flex items-center gap-0.5">
            <Users size={10} />
            <span>
              <span className="font-semibold text-slate-700">
                {interestCount}
              </span>{" "}
              interessiert
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5">
            <Users size={10} />
            <span>
              <span className="font-semibold text-slate-700">{inCount}</span>{" "}
              dabei
              {maybeCount > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-slate-600">
                    {maybeCount}
                  </span>{" "}
                  vielleicht
                </>
              )}
            </span>
          </span>
        )}
      </div>

      {myVoteBadge && (
        <span
          className={`inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${myVoteBadge.className}`}
        >
          {myVoteBadge.text}
        </span>
      )}
    </button>
  );
}
