"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, LogIn, UserPlus, X } from "lucide-react";
import {
  isLikelyEmail,
  normalizeEmail,
  type ParticipantProfile,
} from "@/lib/participants";
import { MIN_PASSWORD_LENGTH } from "@/lib/credentials";
import { normalizeName } from "@/lib/utils";

export type AuthMode = "register" | "login" | "secure";

type AuthModalProps = {
  // Wenn null, ist das Modal zu.
  open: boolean;
  // Optionaler Hinweis darueber, warum das Modal erscheint
  // ("Damit wir deine Stimme zuordnen koennen.").
  reason?: string | null;
  // legacyParticipantId != null aktiviert den dritten Tab "Profil sichern".
  legacyParticipantId?: string | null;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: (profile: ParticipantProfile) => void;
};

type ApiResponse =
  | { ok: true; participant: ParticipantProfile }
  | { ok: false; error: string };

export function AuthModal({
  open,
  reason,
  legacyParticipantId,
  initialMode,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const defaultMode: AuthMode =
    initialMode ?? (legacyParticipantId ? "secure" : "register");
  const [mode, setMode] = useState<AuthMode>(defaultMode);

  // Reset auf das passende Default, wenn das Modal neu geoeffnet wird.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode ?? (legacyParticipantId ? "secure" : "register"));
    setName("");
    setEmail("");
    setPassword("");
    setHotel("");
    setError(null);
  }, [open, initialMode, legacyParticipantId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hotel, setHotel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Body-Scroll-Lock waehrend das Modal offen ist.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const tabs = useMemo<Array<{ mode: AuthMode; label: string }>>(() => {
    const list: Array<{ mode: AuthMode; label: string }> = [
      { mode: "register", label: "Neu hier" },
      { mode: "login", label: "Wieder einloggen" },
    ];
    if (legacyParticipantId) {
      list.push({ mode: "secure", label: "Profil sichern" });
    }
    return list;
  }, [legacyParticipantId]);

  if (!open) return null;

  function validate(): string | null {
    const cleanedEmail = normalizeEmail(email);
    if (!cleanedEmail) return "Bitte gib deine E-Mail an.";
    if (!isLikelyEmail(cleanedEmail)) {
      return "Diese E-Mail sieht nicht ganz richtig aus.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Bitte waehle ein Kennwort mit mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
    }
    if (mode === "register") {
      const cleanedName = normalizeName(name);
      if (!cleanedName) return "Bitte gib deinen Namen ein.";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const cleanedEmail = normalizeEmail(email)!;
    const cleanedName = normalizeName(name);
    const cleanedHotel = hotel.trim() ? hotel.trim() : null;

    const endpoint =
      mode === "register"
        ? "/api/participants/register"
        : mode === "login"
          ? "/api/participants/login"
          : "/api/participants/secure";

    const payload: Record<string, unknown> =
      mode === "register"
        ? {
            display_name: cleanedName,
            email: cleanedEmail,
            password,
            hotel_info: cleanedHotel,
          }
        : mode === "login"
          ? { email: cleanedEmail, password }
          : {
              participant_id: legacyParticipantId,
              email: cleanedEmail,
              password,
            };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      let parsed: ApiResponse | null = null;
      try {
        parsed = (await response.json()) as ApiResponse;
      } catch {
        parsed = null;
      }
      if (!response.ok || !parsed || !parsed.ok) {
        const message =
          (parsed && !parsed.ok && parsed.error) ||
          `Server antwortete unerwartet (HTTP ${response.status}).`;
        setError(message);
        return;
      }
      onSuccess(parsed.participant);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Verbindung fehlgeschlagen. Bitte erneut versuchen.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const heading =
    mode === "register"
      ? "Kurzprofil erstellen"
      : mode === "login"
        ? "Wieder einloggen"
        : "Profil sichern";
  const subline =
    mode === "secure"
      ? "Hinterlege eine E-Mail und ein Kennwort, damit du dein bestehendes Profil auch auf anderen Geraeten wiederfindest."
      : "Damit wir deine Interessen und Zusagen wiederfinden koennen.";
  const submitLabel =
    mode === "register"
      ? "Profil erstellen"
      : mode === "login"
        ? "Einloggen"
        : "Profil sichern";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
          aria-label="Schliessen"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-soft transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          disabled={isSubmitting}
        >
          <X size={16} />
        </button>

        <div className="px-5 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
              {mode === "login" ? (
                <LogIn size={20} />
              ) : mode === "secure" ? (
                <KeyRound size={20} />
              ) : (
                <UserPlus size={20} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="auth-modal-title"
                className="text-lg font-semibold tracking-tight text-slate-900"
              >
                {heading}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{subline}</p>
              {reason && (
                <p className="mt-1 text-xs text-slate-500">{reason}</p>
              )}
            </div>
          </div>

          <div
            role="tablist"
            className="mb-4 flex gap-2 rounded-2xl bg-slate-100 p-1"
          >
            {tabs.map((t) => {
              const active = mode === t.mode;
              return (
                <button
                  key={t.mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (isSubmitting) return;
                    setMode(t.mode);
                    setError(null);
                  }}
                  className={
                    "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition " +
                    (active
                      ? "bg-white text-slate-900 shadow-soft"
                      : "text-slate-600 hover:text-slate-900")
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <>
                <Field
                  id="auth-name"
                  label="Name"
                  required
                  value={name}
                  onChange={(v) => setName(v)}
                  disabled={isSubmitting}
                  autoComplete="given-name"
                  placeholder="Wie sollen wir dich nennen?"
                />
              </>
            )}

            <Field
              id="auth-email"
              label="E-Mail"
              required
              type="email"
              inputMode="email"
              value={email}
              onChange={(v) => setEmail(v)}
              disabled={isSubmitting}
              autoComplete="email"
              placeholder="name@beispiel.de"
              helpText="Wird nicht oeffentlich angezeigt."
            />

            <Field
              id="auth-password"
              label="Kennwort"
              required
              type="password"
              value={password}
              onChange={(v) => setPassword(v)}
              disabled={isSubmitting}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Mindestens 6 Zeichen"
              helpText={
                mode === "login"
                  ? undefined
                  : "Damit du dein Profil spaeter wiederfindest."
              }
            />

            {mode === "register" && (
              <Field
                id="auth-hotel"
                label="Hotel / Standort (optional)"
                value={hotel}
                onChange={(v) => setHotel(v)}
                disabled={isSubmitting}
                autoComplete="off"
                placeholder="z. B. Palma oder El Arenal"
              />
            )}

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            {mode === "login" && (
              <p className="text-xs text-slate-500">
                Passwort vergessen? Schreib Dennis kurz.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Bitte warten...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  inputMode?: "email" | "text";
  autoComplete?: string;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
};

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  helpText,
  disabled,
}: FieldProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        required={required}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={helpId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50"
      />
      {helpText && (
        <p id={helpId} className="mt-1 text-xs text-slate-500">
          {helpText}
        </p>
      )}
    </div>
  );
}
