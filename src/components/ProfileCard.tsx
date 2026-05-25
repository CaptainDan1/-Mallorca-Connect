"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Pencil, X } from "lucide-react";
import { avatarGradient, getInitials } from "@/lib/utils";
import {
  isLikelyEmail,
  normalizeEmail,
  type ParticipantProfile,
} from "@/lib/participants";
import { AvatarUpload } from "@/components/AvatarUpload";

type ProfileCardProps = {
  participant: ParticipantProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  disabled?: boolean;
  onSubmit: (input: {
    display_name: string;
    hotel_info: string | null;
    email: string;
  }) => Promise<void> | void;
  isUpdatingAvatar: boolean;
  avatarError: string | null;
  onAvatarUploaded: (publicUrl: string) => Promise<void> | void;
};

export function ProfileCard({
  participant,
  isLoading,
  isSaving,
  loadError,
  saveError,
  disabled,
  onSubmit,
  isUpdatingAvatar,
  avatarError,
  onAvatarUploaded,
}: ProfileCardProps) {
  const [name, setName] = useState(participant?.display_name ?? "");
  const [hotel, setHotel] = useState(participant?.hotel_info ?? "");
  const [email, setEmail] = useState(participant?.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  // Edit-Modus: wenn noch kein Profil existiert, automatisch offen.
  const [isEditing, setIsEditing] = useState<boolean>(!participant);

  // Wenn das Profil von aussen geladen wird, Felder uebernehmen.
  useEffect(() => {
    if (participant) {
      setName(participant.display_name);
      setHotel(participant.hotel_info ?? "");
      setEmail(participant.email ?? "");
      // Altprofile ohne E-Mail oeffnen direkt im Edit-Modus, damit die
      // Pflicht-E-Mail nachgepflegt wird.
      setIsEditing(!participant.email);
    } else if (!isLoading) {
      setIsEditing(true);
    }
  }, [participant, isLoading]);

  // "Gespeichert" 3 Sekunden anzeigen.
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || disabled) return;

    const cleanedEmail = normalizeEmail(email);
    if (!cleanedEmail) {
      setEmailError(
        "Bitte gib deine E-Mail an. Sie wird nicht oeffentlich angezeigt.",
      );
      return;
    }
    if (!isLikelyEmail(cleanedEmail)) {
      setEmailError("Diese E-Mail sieht nicht ganz richtig aus.");
      return;
    }
    setEmailError(null);

    setJustSaved(false);
    await onSubmit({
      display_name: name,
      hotel_info: hotel.trim() ? hotel.trim() : null,
      email: cleanedEmail,
    });
    if (!saveError) {
      setJustSaved(true);
      // Nach erfolgreichem Speichern zurueck in die kompakte Ansicht.
      setIsEditing(false);
    }
  }

  function handleCancelEdit() {
    if (!participant) return; // Ohne Profil kein Abbrechen.
    // Auch kein Abbrechen, solange noch keine E-Mail gepflegt ist --
    // wir wollen die Wiedererkennung sicherstellen.
    if (!participant.email) return;
    setName(participant.display_name);
    setHotel(participant.hotel_info ?? "");
    setEmail(participant.email ?? "");
    setEmailError(null);
    setIsEditing(false);
  }

  const initials = getInitials(participant?.display_name || name || "?");
  const gradient = avatarGradient(participant?.display_name || name || "Crew");
  const avatarUrl = participant?.avatar_url ?? null;

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-5 shadow-card border border-white">
      {/* Kompakter Profilkopf */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {participant?.id ? (
            <AvatarUpload
              participantId={participant.id}
              disabled={disabled || isUpdatingAvatar}
              onUploaded={onAvatarUploaded}
              label={
                avatarUrl ? "Profilfoto aendern" : "Profilfoto hinzufuegen"
              }
            >
              <Avatar
                avatarUrl={avatarUrl}
                initials={initials}
                gradient={gradient}
                displayName={participant?.display_name ?? null}
              />
            </AvatarUpload>
          ) : (
            <Avatar
              avatarUrl={avatarUrl}
              initials={initials}
              gradient={gradient}
              displayName={null}
            />
          )}
          {isUpdatingAvatar && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-white">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {participant ? (
            <>
              <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                Hallo {participant.display_name}
              </p>
              {participant.hotel_info ? (
                <p className="truncate text-sm text-slate-500">
                  {participant.hotel_info}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Kein Hotel hinterlegt</p>
              )}
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-900 sm:text-lg">
                Wer bist du?
              </p>
              <p className="text-sm text-slate-500">
                Name und E-Mail sind Pflicht. Hotel ist optional.
              </p>
            </>
          )}
        </div>

        {participant && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={disabled || isLoading || isSaving}
            aria-label="Profil bearbeiten"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {avatarError && participant && (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {avatarError}
        </p>
      )}

      {/* Edit-Modus */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1 block text-xs font-medium text-slate-600"
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
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              E-Mail
            </label>
            <input
              id="profile-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              disabled={disabled || isSaving || isLoading}
              placeholder="name@beispiel.de"
              aria-describedby="profile-email-help"
              aria-invalid={emailError ? true : undefined}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
            />
            <p
              id="profile-email-help"
              className="mt-1 text-xs text-slate-500"
            >
              Pflichtfeld zur Wiedererkennung. Wird nicht oeffentlich
              angezeigt.
            </p>
            {emailError && (
              <p
                role="alert"
                className="mt-1 text-xs text-rose-700"
              >
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="profile-hotel"
              className="mb-1 block text-xs font-medium text-slate-600"
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
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
            />
          </div>

          {(loadError || saveError) && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {saveError || loadError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={
                disabled ||
                isSaving ||
                isLoading ||
                name.trim().length === 0 ||
                email.trim().length === 0
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Speichere...
                </>
              ) : participant ? (
                "Speichern"
              ) : (
                "Profil speichern"
              )}
            </button>
            {participant && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
              >
                <X size={14} />
                Abbrechen
              </button>
            )}
          </div>
        </form>
      )}

      {justSaved && !saveError && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} />
          Profil gespeichert.
        </div>
      )}
    </section>
  );
}

function Avatar({
  avatarUrl,
  initials,
  gradient,
  displayName,
}: {
  avatarUrl: string | null;
  initials: string;
  gradient: string;
  displayName: string | null;
}) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-base font-semibold text-white shadow-soft sm:h-[72px] sm:w-[72px]`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName ?? "Profilbild"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
