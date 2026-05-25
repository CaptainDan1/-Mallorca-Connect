"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, UserRound } from "lucide-react";
import { avatarGradient, getInitials } from "@/lib/utils";
import type { ParticipantProfile } from "@/lib/participants";

type ProfileCardProps = {
  participant: ParticipantProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  disabled?: boolean;
  onSubmit: (input: { display_name: string; hotel_info: string | null }) => Promise<void> | void;
};

export function ProfileCard({
  participant,
  isLoading,
  isSaving,
  loadError,
  saveError,
  disabled,
  onSubmit,
}: ProfileCardProps) {
  const [name, setName] = useState(participant?.display_name ?? "");
  const [hotel, setHotel] = useState(participant?.hotel_info ?? "");
  const [justSaved, setJustSaved] = useState(false);

  // Wenn das Profil von aussen geladen wird, Felder uebernehmen.
  useEffect(() => {
    if (participant) {
      setName(participant.display_name);
      setHotel(participant.hotel_info ?? "");
    }
  }, [participant]);

  // "Gespeichert" 3 Sekunden anzeigen.
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || disabled) return;
    setJustSaved(false);
    await onSubmit({
      display_name: name,
      hotel_info: hotel.trim() ? hotel.trim() : null,
    });
    if (!saveError) {
      setJustSaved(true);
    }
  }

  const initials = getInitials(participant?.display_name || name || "?");
  const gradient = avatarGradient(participant?.display_name || name || "Crew");
  const avatarUrl = participant?.avatar_url ?? null;

  return (
    <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-card border border-white">
      <div className="mb-4 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-base font-semibold text-white shadow-soft`}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={participant?.display_name ?? "Profilbild"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-amber-700">
            <UserRound size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Dein Profil
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {participant ? `Hallo ${participant.display_name}` : "Wer bist du?"}
          </h2>
          <p className="text-sm text-slate-500">
            Name reicht. Hotel ist optional, hilft aber beim Treffen.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="profile-name"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || isSaving || isLoading}
            placeholder="Wie sollen wir dich nennen?"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="profile-hotel"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Hotel / Standort (optional)
          </label>
          <input
            id="profile-hotel"
            type="text"
            autoComplete="off"
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
            disabled={disabled || isSaving || isLoading}
            placeholder="z. B. Palma oder El Arenal"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
          />
        </div>

        {(loadError || saveError) && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {saveError || loadError}
          </div>
        )}

        {justSaved && !saveError && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={16} />
            Profil gespeichert.
          </div>
        )}

        <button
          type="submit"
          disabled={disabled || isSaving || isLoading || name.trim().length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3.5 text-base font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Speichere...
            </>
          ) : participant ? (
            "Profil aktualisieren"
          ) : (
            "Profil speichern"
          )}
        </button>
      </form>
    </section>
  );
}
