"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarRange,
  ChevronRight,
  EyeOff,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  StickyNote,
  Sun,
  Users,
  UserRound,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  PROPOSAL_MODERATION_BADGE,
  PROPOSAL_MODERATION_LABELS,
  PROPOSAL_SLOT_LABELS,
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  formatTripDay,
  isScheduled,
  type EventProposal,
} from "@/lib/proposals";
import {
  EVENT_VOTES_TABLE,
  PARTICIPANTS_TABLE,
  type EventVote,
  type ParticipantProfile,
} from "@/lib/participants";
import { EVENT_INTEREST_TABLE, type EventInterest } from "@/lib/interest";

type FilterKey =
  | "all"
  | "pending"
  | "pool"
  | "planned"
  | "approved"
  | "rejected"
  | "inactive";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "pending", label: "Wartet auf Freigabe" },
  { key: "pool", label: "Aktivitaetspool" },
  { key: "planned", label: "Gruppenplan" },
  { key: "approved", label: "Freigegeben" },
  { key: "rejected", label: "Abgelehnt" },
  { key: "inactive", label: "Inaktiv" },
];

function matchesFilter(proposal: EventProposal, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "pending":
      return proposal.moderation_status === "pending";
    case "pool":
      return (
        proposal.moderation_status === "approved" &&
        proposal.is_active &&
        !isScheduled(proposal)
      );
    case "planned":
      return (
        proposal.moderation_status === "approved" &&
        proposal.is_active &&
        isScheduled(proposal)
      );
    case "approved":
      return (
        proposal.moderation_status === "approved" && proposal.is_active
      );
    case "rejected":
      return proposal.moderation_status === "rejected";
    case "inactive":
      return !proposal.is_active;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [submitters, setSubmitters] = useState<
    Map<string, ParticipantProfile>
  >(new Map());
  const [votesByProposal, setVotesByProposal] = useState<
    Map<string, { in: number; maybe: number; out: number }>
  >(new Map());
  const [interestCountByProposal, setInterestCountByProposal] = useState<
    Map<string, number>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured) {
      setLoadError(
        "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .select("*")
        .order("moderation_status", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("event_start", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const list = (data as EventProposal[]) ?? [];
      setProposals(list);

      const submitterIds = Array.from(
        new Set(
          list
            .map((p) => p.submitted_by_participant_id)
            .filter((v): v is string => Boolean(v)),
        ),
      );
      if (submitterIds.length > 0) {
        const { data: peopleRaw } = await supabase
          .from(PARTICIPANTS_TABLE)
          .select("id, display_name, hotel_info, avatar_url")
          .in("id", submitterIds);
        const map = new Map<string, ParticipantProfile>();
        for (const p of (peopleRaw as ParticipantProfile[]) ?? []) {
          map.set(p.id, p);
        }
        setSubmitters(map);
      } else {
        setSubmitters(new Map());
      }

      // Counts pro Vorschlag: Votes + Interesse.
      const [votesRes, interestRes] = await Promise.all([
        supabase
          .from(EVENT_VOTES_TABLE)
          .select("proposal_id, vote"),
        supabase
          .from(EVENT_INTEREST_TABLE)
          .select("proposal_id"),
      ]);
      const voteMap = new Map<
        string,
        { in: number; maybe: number; out: number }
      >();
      for (const v of (votesRes.data as Pick<
        EventVote,
        "proposal_id" | "vote"
      >[]) ?? []) {
        const bucket = voteMap.get(v.proposal_id) ?? {
          in: 0,
          maybe: 0,
          out: 0,
        };
        if (v.vote === "in") bucket.in += 1;
        else if (v.vote === "maybe") bucket.maybe += 1;
        else bucket.out += 1;
        voteMap.set(v.proposal_id, bucket);
      }
      setVotesByProposal(voteMap);

      const interestMap = new Map<string, number>();
      for (const i of (interestRes.data as Pick<
        EventInterest,
        "proposal_id"
      >[]) ?? []) {
        interestMap.set(
          i.proposal_id,
          (interestMap.get(i.proposal_id) ?? 0) + 1,
        );
      }
      setInterestCountByProposal(interestMap);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Vorschlaege konnten nicht geladen werden.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // egal -- wir leiten ohnehin auf die Login-Seite.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  async function applyQuickAction(
    proposalId: string,
    action: "approve" | "reject",
  ) {
    if (busyId) return;
    setBusyId(proposalId);
    try {
      const supabase = getSupabaseClient();
      const update =
        action === "approve"
          ? { moderation_status: "approved" as const, is_active: true }
          : { moderation_status: "rejected" as const, is_active: false };
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .update(update)
        .eq("id", proposalId)
        .select("*")
        .single();
      if (error) throw error;
      const updated = data as EventProposal;
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? updated : p)),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Aktion hat nicht geklappt.";
      setLoadError(message);
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      all: proposals.length,
      pending: 0,
      pool: 0,
      planned: 0,
      approved: 0,
      rejected: 0,
      inactive: 0,
    };
    for (const p of proposals) {
      if (p.moderation_status === "pending") result.pending += 1;
      if (p.moderation_status === "approved" && p.is_active) {
        result.approved += 1;
        if (isScheduled(p)) {
          result.planned += 1;
        } else {
          result.pool += 1;
        }
      }
      if (p.moderation_status === "rejected") result.rejected += 1;
      if (!p.is_active) result.inactive += 1;
    }
    return result;
  }, [proposals]);

  const filtered = useMemo(
    () => proposals.filter((p) => matchesFilter(p, filter)),
    [proposals, filter],
  );

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-24 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-soft">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Adminbereich
              </h1>
              <p className="text-sm text-slate-600">
                Event-Vorschlaege fuer die Reise verwalten.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoggingOut ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            Admin abmelden
          </button>
        </header>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {isLoading
              ? "Lade Vorschlaege..."
              : `${counts.all} Vorschlag${counts.all === 1 ? "" : "e"} insgesamt, ${counts.pending} warten auf Freigabe.`}
          </p>
          <Link
            href="/admin/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600"
          >
            <Plus size={16} />
            Neuer Vorschlag
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition " +
                  (active
                    ? "bg-slate-900 text-white shadow-soft"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")
                }
              >
                <span>{f.label}</span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs " +
                    (active
                      ? "bg-white/20 text-white"
                      : f.key === "pending" && count > 0
                        ? "bg-sky-100 text-sky-800"
                        : "bg-slate-100 text-slate-600")
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {loadError}
          </div>
        )}

        {!isLoading && filtered.length === 0 && !loadError && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-base font-medium text-slate-700">
              {filter === "pending"
                ? "Keine Vorschlaege warten auf Freigabe."
                : "Keine Vorschlaege in dieser Ansicht."}
            </p>
            {filter === "all" && (
              <p className="mt-1 text-sm text-slate-500">
                Leg den ersten Event-Vorschlag fuer die Crew an.
              </p>
            )}
          </div>
        )}

        <ul className="space-y-3">
          {filtered.map((proposal) => {
            const eventDate = formatProposalDate(proposal.event_start);
            const submitter = proposal.submitted_by_participant_id
              ? submitters.get(proposal.submitted_by_participant_id)
              : null;
            const isPending = proposal.moderation_status === "pending";
            const scheduled = isScheduled(proposal);
            return (
              <li key={proposal.id}>
                <div
                  className={
                    "flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-card transition " +
                    (isPending
                      ? "border-sky-200 ring-1 ring-sky-100"
                      : "border-white")
                  }
                >
                  <Link
                    href={`/admin/${proposal.id}`}
                    className="group flex items-stretch gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">
                          {proposal.title}
                        </h2>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${PROPOSAL_STATUS_BADGE[proposal.status]}`}
                        >
                          {PROPOSAL_STATUS_LABELS[proposal.status]}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${PROPOSAL_MODERATION_BADGE[proposal.moderation_status]}`}
                        >
                          {
                            PROPOSAL_MODERATION_LABELS[
                              proposal.moderation_status
                            ]
                          }
                        </span>
                        {scheduled ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                            <CalendarRange size={12} />
                            Gruppenplan
                          </span>
                        ) : (
                          proposal.moderation_status === "approved" &&
                          proposal.is_active && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Pool
                            </span>
                          )
                        )}
                        {!proposal.is_active && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <EyeOff size={12} />
                            Inaktiv
                          </span>
                        )}
                      </div>

                      {proposal.short_description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {proposal.short_description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {scheduled && (
                          <span className="inline-flex items-center gap-1 font-medium text-sky-800">
                            <CalendarRange size={14} />
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
                        {(proposal.min_participants != null ||
                          proposal.capacity != null) && (
                          <span className="inline-flex items-center gap-1">
                            <Users size={14} />
                            {proposal.min_participants != null
                              ? `min ${proposal.min_participants}`
                              : null}
                            {proposal.min_participants != null &&
                            proposal.capacity != null
                              ? " · "
                              : null}
                            {proposal.capacity != null
                              ? `max ${proposal.capacity}`
                              : null}
                          </span>
                        )}
                        {submitter && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound size={14} />
                            Eingereicht von {submitter.display_name}
                          </span>
                        )}
                      </div>

                      {proposal.plan_note && (
                        <p className="inline-flex items-start gap-1.5 rounded-2xl bg-amber-50 px-3 py-1.5 text-xs text-amber-900 ring-1 ring-amber-100">
                          <StickyNote size={12} className="mt-0.5 shrink-0" />
                          {proposal.plan_note}
                        </p>
                      )}

                      <AdminCounts
                        scheduled={scheduled}
                        interestCount={
                          interestCountByProposal.get(proposal.id) ?? 0
                        }
                        votes={
                          votesByProposal.get(proposal.id) ?? {
                            in: 0,
                            maybe: 0,
                            out: 0,
                          }
                        }
                      />
                    </div>

                    <div className="flex items-center text-slate-400 group-hover:text-sky-500">
                      <ChevronRight size={20} />
                    </div>
                  </Link>

                  {isPending && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => applyQuickAction(proposal.id, "approve")}
                        disabled={busyId === proposal.id}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busyId === proposal.id && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        Freigeben
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickAction(proposal.id, "reject")}
                        disabled={busyId === proposal.id}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-rose-700 shadow-soft transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

function AdminCounts({
  scheduled,
  interestCount,
  votes,
}: {
  scheduled: boolean;
  interestCount: number;
  votes: { in: number; maybe: number; out: number };
}) {
  if (scheduled) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-100">
          <Users size={12} />
          {votes.in} dabei
        </span>
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-100">
          {votes.maybe} vielleicht
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200">
          {votes.out} raus
        </span>
        {interestCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-medium text-rose-800 ring-1 ring-rose-100">
            <Heart size={12} />
            {interestCount} fruehes Interesse
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-100">
        <Sun size={12} />
        {interestCount} interessiert
      </span>
      <span className="text-slate-500">&middot; noch nicht eingeplant</span>
    </div>
  );
}
