"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronRight,
  EyeOff,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  PROPOSAL_STATUS_BADGE,
  PROPOSAL_STATUS_LABELS,
  formatProposalDate,
  type EventProposal,
} from "@/lib/proposals";

export default function AdminPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        .order("sort_order", { ascending: true })
        .order("event_start", { ascending: true, nullsFirst: false });
      if (error) throw error;
      setProposals((data as EventProposal[]) ?? []);
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
      // Selbst wenn der Call fehlschlaegt, schicken wir zur Login-Seite.
    }
    router.replace("/admin/login");
    router.refresh();
  }

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
              : `${proposals.length} Vorschlag${proposals.length === 1 ? "" : "e"} insgesamt.`}
          </p>
          <Link
            href="/admin/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600"
          >
            <Plus size={16} />
            Neuer Vorschlag
          </Link>
        </div>

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {loadError}
          </div>
        )}

        {!isLoading && proposals.length === 0 && !loadError && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-base font-medium text-slate-700">
              Noch keine Vorschlaege.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Leg den ersten Event-Vorschlag fuer die Crew an.
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {proposals.map((proposal) => {
            const eventDate = formatProposalDate(proposal.event_start);
            return (
              <li key={proposal.id}>
                <Link
                  href={`/admin/${proposal.id}`}
                  className="group flex items-stretch gap-4 rounded-3xl border border-white bg-white p-5 shadow-card transition hover:border-sky-200"
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
                  </div>

                  <div className="flex items-center text-slate-400 group-hover:text-sky-500">
                    <ChevronRight size={20} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
