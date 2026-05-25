"use client";

import { avatarGradient, getInitials } from "@/lib/utils";
import type { ParticipantProfile } from "@/lib/participants";

type AttendeesMode = "in" | "interested";

type ProposalAttendeesProps = {
  /** Teilnehmer (bereits dedupliziert + aufgeloest). */
  participants: ParticipantProfile[];
  /** Maximale Anzahl Avatare in der Stapelansicht. */
  maxAvatars?: number;
  /** Avatargroesse: "sm" fuer Karten, "lg" fuer Detailansicht. */
  size?: "sm" | "lg";
  /** Empty-State-Text. */
  emptyText?: string;
  /**
   * "in" (default): "... ist/sind dabei".
   * "interested":  "... ist/sind interessiert".
   * Aendert nur den Begleittext, nicht die Avatare.
   */
  mode?: AttendeesMode;
};

export function ProposalAttendees({
  participants,
  maxAvatars = 5,
  size = "sm",
  emptyText = "Noch niemand dabei",
  mode = "in",
}: ProposalAttendeesProps) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-slate-500">{emptyText}</p>
    );
  }

  const visible = participants.slice(0, maxAvatars);
  const overflow = participants.length - visible.length;

  const avatarClass =
    size === "lg"
      ? "h-9 w-9 text-xs"
      : "h-7 w-7 text-[10px]";
  const ringClass =
    size === "lg" ? "ring-2 ring-white" : "ring-2 ring-white";
  const overlap = size === "lg" ? "-ml-2" : "-ml-2";

  const names = participants.map((p) => p.display_name);
  const summary = formatNames(names, mode);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        {visible.map((p, idx) => {
          const gradient = avatarGradient(p.display_name);
          return (
            <span
              key={p.id}
              className={`relative inline-flex ${avatarClass} ${ringClass} ${idx === 0 ? "" : overlap} items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${gradient} font-semibold text-white shadow-soft`}
              title={p.display_name}
            >
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar_url}
                  alt={p.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{getInitials(p.display_name)}</span>
              )}
            </span>
          );
        })}
        {overflow > 0 && (
          <span
            className={`inline-flex ${avatarClass} ${ringClass} ${overlap} items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700`}
          >
            +{overflow}
          </span>
        )}
      </div>
      <p className="min-w-0 truncate text-sm text-slate-700">
        <span className="font-medium">{summary}</span>
      </p>
    </div>
  );
}

function formatNames(names: string[], mode: AttendeesMode): string {
  const singular = mode === "interested" ? "ist interessiert" : "ist dabei";
  const plural = mode === "interested" ? "sind interessiert" : "sind dabei";
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} ${singular}`;
  if (names.length === 2) return `${names[0]} und ${names[1]} ${plural}`;
  if (names.length === 3) {
    return `${names[0]}, ${names[1]} und ${names[2]} ${plural}`;
  }
  const remaining = names.length - 2;
  return `${names[0]}, ${names[1]} und ${remaining} weitere ${plural}`;
}
