"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DENNIS_AVATAR_SRC = "/images/dennis/dennis.jpg";
const WELCOME_SEEN_KEY = "mallorca_welcome_seen";

type WelcomeModalProps = {
  // Wenn ein Profil existiert, soll das Modal grundsaetzlich nicht
  // erscheinen. Das Eltern-Element soll das Modal dann aber moeglichst
  // gar nicht erst mounten, damit nichts blitzt.
  hasParticipant: boolean;
  // Solange das Profil noch laedt, halten wir das Modal zu. Wer schon
  // ein Profil hat, soll die Karte nicht kurz aufblitzen sehen.
  isLoading: boolean;
};

function readSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, "true");
  } catch {
    // localStorage kann blockiert sein -- still erlaubt.
  }
}

// Persoenliches Willkommensmodal von Dennis. Erscheint einmalig fuer
// neue Besucher (kein Profil + Flag nicht gesetzt). Nach Klick auf
// "Verstanden" oder nach Profilanlage nicht mehr.
export function WelcomeCard({
  hasParticipant,
  isLoading,
}: WelcomeModalProps) {
  const [open, setOpen] = useState(false);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (hasParticipant) {
      setOpen(false);
      return;
    }
    setOpen(!readSeen());
  }, [hasParticipant, isLoading]);

  // Body-Scroll lock waehrend das Modal offen ist.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function handleDismiss() {
    writeSeen();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Schliessen"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-soft transition hover:bg-slate-50 hover:text-slate-800"
        >
          <X size={16} />
        </button>

        <div className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="shrink-0">
              {imageOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={DENNIS_AVATAR_SRC}
                  alt="Dennis"
                  width={72}
                  height={72}
                  loading="lazy"
                  onError={() => setImageOk(false)}
                  className="h-[72px] w-[72px] rounded-full object-cover shadow-soft ring-2 ring-white"
                />
              ) : (
                <div
                  aria-label="Dennis"
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-semibold text-white shadow-soft ring-2 ring-white"
                >
                  D
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h2
                id="welcome-modal-title"
                className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
              >
                Willkommen bei Mallorca-Connect
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                <p>
                  Ich bin Dennis, 45, aus Norddeutschland. Ich bin im Juni
                  auf Mallorca und suche entspannte Leute fuer gemeinsame
                  Unternehmungen vor Ort.
                </p>
                <p>
                  Diese Seite ist privat und werbefrei. Ich bekomme keine
                  Provision, Verguetung oder sonstige Vorteile.
                </p>
                <p>
                  Mein Beweggrund: Ich moechte im Urlaub unkompliziert
                  Leute treffen und gemeinsam etwas erleben.
                </p>
                <p>
                  Schau dir die Aktivitaeten an, markiere dein Interesse,
                  schlag eigene Ideen vor und entscheide bei konkreten
                  Terminen, ob du dabei bist.
                </p>
                <p>
                  Mach nur das mit, worauf du Lust hast. Wenn sich eine
                  kleine Gruppe findet, planen wir es verbindlicher. Wenn
                  nicht, ist das auch okay.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 sm:w-auto"
            >
              Verstanden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
