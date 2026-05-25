"use client";

import { useMemo, useState } from "react";
import { Info, Loader2, Send } from "lucide-react";
import {
  ACTIVITIES,
  type ActivityDefinition,
  type ActivityKey,
} from "@/lib/activities";
import { classNames } from "@/lib/utils";
import type { VoteInput, VoteSelection } from "@/hooks/useVotes";

const EMPTY_SELECTION: VoteSelection = {
  ebike_tour: false,
  roller_tour: false,
  schnorcheln: false,
  bootsausflug: false,
  megapark: false,
};

export type VoteFormProps = {
  onSubmit: (input: VoteInput) => Promise<unknown>;
  isSaving: boolean;
  errorMessage?: string | null;
  disabled?: boolean;
};

export function VoteForm({
  onSubmit,
  isSaving,
  errorMessage,
  disabled,
}: VoteFormProps) {
  const [name, setName] = useState("");
  const [hotel, setHotel] = useState("");
  const [selection, setSelection] = useState<VoteSelection>(EMPTY_SELECTION);
  const [touched, setTouched] = useState(false);

  const selectedCount = useMemo(
    () => Object.values(selection).filter(Boolean).length,
    [selection],
  );

  function toggle(key: ActivityKey) {
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    if (isSaving || disabled) return;
    await onSubmit({
      user_name: name,
      hotel_info: hotel.trim() ? hotel : null,
      selection,
    });
  }

  const nameInvalid = touched && !name.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-5 sm:p-7 shadow-soft ring-1 ring-slate-100"
    >
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
          Worauf hast du Lust?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Waehle so viele Aktivitaeten, wie du moechtest. Du kannst spaeter
          jederzeit anpassen.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIVITIES.map((activity) => (
          <ActivityCard
            key={activity.key}
            activity={activity}
            selected={selection[activity.key]}
            onToggle={() => toggle(activity.key)}
            disabled={disabled || isSaving}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Dein Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="z.B. Anna"
            autoComplete="given-name"
            disabled={disabled || isSaving}
            className={classNames(
              "w-full rounded-2xl border bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400",
              nameInvalid
                ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                : "border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200",
            )}
          />
          {nameInvalid && (
            <p className="mt-1.5 text-xs text-rose-600">
              Bitte gib deinen Namen ein.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="hotel"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Hotel oder Standort <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="hotel"
            type="text"
            value={hotel}
            onChange={(event) => setHotel(event.target.value)}
            placeholder="z.B. Cala Millor"
            disabled={disabled || isSaving}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>
      </div>

      {selection.roller_tour && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p>
            <strong>125er-Roller:</strong> Fuehrerschein Klasse B muss in
            Spanien in der Regel seit mindestens 3 Jahren bestehen. Bitte vor
            Ort selbst pruefen.
          </p>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {selectedCount === 0
            ? "Noch nichts gewaehlt — auch okay."
            : `${selectedCount} ${selectedCount === 1 ? "Aktivitaet" : "Aktivitaeten"} gewaehlt`}
        </span>
        <button
          type="submit"
          disabled={isSaving || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-base font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Speichere...
            </>
          ) : (
            <>
              <Send size={18} />
              Auswahl speichern
            </>
          )}
        </button>
      </div>
    </form>
  );
}

type ActivityCardProps = {
  activity: ActivityDefinition;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

function ActivityCard({
  activity,
  selected,
  onToggle,
  disabled,
}: ActivityCardProps) {
  const Icon = activity.icon;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={classNames(
        "group relative flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left transition-all duration-200 ease-in-out",
        "min-h-[88px]",
        selected
          ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500 shadow-soft"
          : "border-slate-200 hover:border-amber-300 hover:shadow-soft",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <span
        className={classNames(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-soft transition",
          "bg-gradient-to-br",
          activity.accent,
        )}
      >
        <Icon size={22} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-slate-900">
          {activity.title}
        </span>
        <span className="block text-xs text-slate-500 mt-0.5">
          {activity.subtitle}
        </span>
      </span>
      <span
        className={classNames(
          "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
          selected
            ? "border-amber-500 bg-amber-500 text-white"
            : "border-slate-300 bg-white",
        )}
        aria-hidden
      >
        {selected && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0L2.97 8.53a.75.75 0 1 1 1.06-1.06l2.72 2.72 5.97-5.97a.75.75 0 0 1 1.06 0z" />
          </svg>
        )}
      </span>
    </button>
  );
}
