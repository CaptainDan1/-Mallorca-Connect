"use client";

import { MapPin, Users, Loader2, AlertTriangle, Palmtree } from "lucide-react";
import { type Vote } from "@/lib/supabase";
import { ACTIVITIES, type ActivityKey } from "@/lib/activities";
import { avatarGradient, getInitials, classNames } from "@/lib/utils";

export type CrewListProps = {
  votes: Vote[];
  isLoading: boolean;
  errorMessage?: string | null;
};

export function CrewList({ votes, isLoading, errorMessage }: CrewListProps) {
  return (
    <section className="rounded-3xl bg-white p-5 sm:p-7 shadow-soft ring-1 ring-slate-100">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Wer ist dabei?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Eure Crew und worauf sie Lust hat.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
          <Users size={14} />
          {votes.length}
        </span>
      </header>

      {isLoading && <CrewLoading />}
      {!isLoading && errorMessage && <CrewError message={errorMessage} />}
      {!isLoading && !errorMessage && votes.length === 0 && <CrewEmpty />}

      {!isLoading && !errorMessage && votes.length > 0 && (
        <ul className="space-y-3">
          {votes.map((vote) => (
            <CrewItem key={vote.id} vote={vote} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CrewItem({ vote }: { vote: Vote }) {
  const selectedKeys = ACTIVITIES.filter(
    (activity) => vote[activity.key as ActivityKey] === true,
  );

  return (
    <li className="rounded-2xl border border-slate-100 bg-stone-50/60 p-4 transition hover:bg-stone-50">
      <div className="flex items-start gap-4">
        <div
          className={classNames(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-semibold tracking-wide shadow-soft",
            "bg-gradient-to-br",
            avatarGradient(vote.user_name),
          )}
          aria-hidden
        >
          {getInitials(vote.user_name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {vote.user_name}
            </h3>
          </div>

          {vote.hotel_info && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} />
              <span className="truncate">{vote.hotel_info}</span>
            </p>
          )}

          {selectedKeys.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedKeys.map((activity) => {
                const Icon = activity.icon;
                return (
                  <span
                    key={activity.key}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-medium ring-1 ring-slate-200"
                  >
                    <Icon size={12} />
                    {activity.pillLabel}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Noch keine Aktivitaet gewaehlt &ndash; chillt vielleicht einfach.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function CrewLoading() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-stone-50 py-10 text-sm text-slate-500">
      <Loader2 size={16} className="animate-spin" />
      Stimmen werden geladen...
    </div>
  );
}

function CrewError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Liste konnte nicht geladen werden.</p>
        <p className="mt-1 text-rose-700/90">{message}</p>
      </div>
    </div>
  );
}

function CrewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-stone-50 px-6 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-soft animate-soft-pulse">
        <Palmtree size={24} />
      </div>
      <p className="text-base font-medium text-slate-700">
        Noch ist es ruhig am Strand.
      </p>
      <p className="mt-1 text-sm text-slate-500">Mach den ersten Schritt!</p>
    </div>
  );
}
