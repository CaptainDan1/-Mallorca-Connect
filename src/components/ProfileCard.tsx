"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { avatarGradient, getInitials } from "@/lib/utils";
import type { ParticipantProfile } from "@/lib/participants";
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
  }) => Promise<void> | void;
  isUpdatingAvatar: boolean;
  avatarError: string | null;
  onAvatarUploaded: (publicUrl: string) => Promise<void> | void;
  // Geschuetzte Aktionen oeffnen ueber diesen Callback das AuthModal.
  // Wenn null, ist Auth nicht eingerichtet (Supabase nicht konfiguriert).
  onOpenAuth: (mode: "register" | "login" | "secure") => void;
  onLogout: () => void;
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
  onOpenAuth,
  onLogout,
}: ProfileCardProps) {
  const [name, setName] = useState(participant?.display_name ?? "");
  const [hotel, setHotel] = useState(participant?.hotel_info ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Wenn das Profil von aussen geladen wird, Felder uebernehmen.
  useEffect(() => {
    if (participant) {
      setName(participant.display_name);
      setHotel(participant.hotel_info ?? "");
      setIsEditing(false);
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
    if (isSaving || disabled || !participant) return;
    setJustSaved(false);
    await onSubmit({
      display_name: name,
      hotel_info: hotel.trim() ? hotel.trim() : null,
    });
    if (!saveError) {
      setJustSaved(true);
      setIsEditing(false);
    }
  }

  function handleCancelEdit() {
    if (!participant) return;
    setName(participant.display_name);
    setHotel(participant.hotel_info ?? "");
    setIsEditing(false);
  }

  const initials = getInitials(participant?.display_name || name || "?");
  const gradient = avatarGradient(participant?.display_name || name || "Crew");
  const avatarUrl = participant?.avatar_url ?? null;

  // Besucher-Modus: noch kein Profil. Statt eines grossen Formulars
  // zeigen wir eine sehr leichte Karte mit zwei Optionen
  // (Profil erstellen / Wieder einloggen). Das echte Formular liegt im
  // AuthModal, das ueber geschuetzte Aktionen ebenfalls aufgeht.
  if (!participant) {
    return (
      <section className="rounded-3xl bg-white p-4 sm:p-5 shadow-card border border-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 sm:text-lg">
              Du stoeberst gerade als Gast.
            </p>
            <p className="text-sm text-slate-600">
              Wenn du Interesse zeigen oder abstimmen willst, brauchen wir
              ein Kurzprofil.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              disabled={disabled || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={14} />
              Profil erstellen
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              disabled={disabled || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={14} />
              Wieder einloggen
            </button>
          </div>
        </div>
        {loadError && (
          <p role="alert" className="mt-3 text-xs text-rose-700">
            {loadError}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-5 shadow-card border border-white">
      <div className="flex items-center gap-4">
        <div className="relative">
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
              displayName={participant.display_name}
            />
          </AvatarUpload>
          {isUpdatingAvatar && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-white">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
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
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={disabled || isLoading || isSaving}
              aria-label="Profil bearbeiten"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              disabled={disabled || isSaving}
              aria-label="Profil abmelden"
              title="Profil abmelden"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {avatarError && (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {avatarError}
        </p>
      )}

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
                name.trim().length === 0
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Speichere...
                </>
              ) : (
                "Speichern"
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
            >
              <X size={14} />
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {justSaved && !saveError && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} />
          Profil gespeichert.
        </div>
      )}

      {/* Hinweis "Profil sichern" -- nur sichtbar, wenn das Profil aus
          dem alten Flow stammt (kein Login hinterlegt). Wer hier klickt,
          legt nachtraeglich Login-Daten an. */}
      {!isEditing && (
        <SecureProfileHint onOpenAuth={() => onOpenAuth("secure")} />
      )}
    </section>
  );
}

function SecureProfileHint({ onOpenAuth }: { onOpenAuth: () => void }) {
  // Wir wissen client-seitig nicht zuverlaessig, ob bereits Credentials
  // existieren. Wir zeigen den Hinweis deshalb dezent und nur als
  // Opt-in. Wer schon einen Login hat, bekommt vom Server eine klare
  // Fehlermeldung ("Dieses Profil ist bereits gesichert.").
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        <ShieldCheck size={13} className="text-slate-400" />
        Profil mit E-Mail und Kennwort sichern? Damit findest du es auch
        auf einem anderen Geraet wieder.
      </p>
      <button
        type="button"
        onClick={onOpenAuth}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
      >
        <KeyRound size={12} />
        Profil sichern
      </button>
    </div>
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
