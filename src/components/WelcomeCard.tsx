"use client";

import { useState } from "react";

const DENNIS_AVATAR_SRC = "/images/dennis/dennis.jpg";

// Persoenliche Willkommenskarte von Dennis. Das Bild kommt lokal aus
// public/images/dennis/dennis.jpg -- bewusst kein Supabase-Storage,
// damit die Startseite auch ohne Login/Profil schnell laedt. Faellt
// das Bild aus (z.B. Datei fehlt), zeigen wir einen Initialen-Avatar.
export function WelcomeCard() {
  const [imageOk, setImageOk] = useState(true);

  return (
    <section
      aria-labelledby="welcome-card-title"
      className="rounded-3xl border border-white bg-white p-5 sm:p-6 shadow-card"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="shrink-0">
          {imageOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={DENNIS_AVATAR_SRC}
              alt="Dennis"
              width={80}
              height={80}
              loading="lazy"
              onError={() => setImageOk(false)}
              className="h-20 w-20 rounded-full object-cover shadow-soft ring-2 ring-white"
            />
          ) : (
            <div
              aria-label="Dennis"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-semibold text-white shadow-soft ring-2 ring-white"
            >
              Dennis
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <h2
            id="welcome-card-title"
            className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
          >
            Willkommen bei Mallorca-Connect
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
            <p>
              Ich bin Dennis, 45, aus Norddeutschland. Ich bin im Juni auf
              Mallorca und suche entspannte Leute fuer gemeinsame
              Unternehmungen vor Ort.
            </p>
            <p>
              Diese Seite ist 100&nbsp;% privat und 100&nbsp;% werbefrei.
              Ich bekomme nirgendwo Provision, Verguetung oder sonstige
              Vorteile.
            </p>
            <p>
              Mein einziger Beweggrund: Ich moechte im Urlaub unkompliziert
              Leute treffen und gemeinsam etwas erleben.
            </p>
            <p>
              Schau dir die Aktivitaeten an, markiere dein Interesse,
              schlag eigene Ideen vor und entscheide bei konkreten
              Terminen, ob du dabei bist.
            </p>
            <p>
              Mach nur das mit, worauf du Lust hast. Wenn sich eine kleine
              Gruppe findet, planen wir es verbindlicher. Wenn nicht, ist
              das auch voellig okay.
            </p>
            <p className="font-medium text-slate-900">
              Alles kann, nichts muss. Kein Zwang, kein Druck, kein Drama.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
