"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_OPTIONS,
  emptyProposalInput,
  fromLocalDatetimeInputValue,
  toLocalDatetimeInputValue,
  trimOrNull,
  type EventProposalInput,
  type ProposalStatus,
} from "@/lib/proposals";

type ProposalFormProps = {
  initialValues?: EventProposalInput;
  submitLabel?: string;
  isSaving: boolean;
  errorMessage: string | null;
  onSubmit: (values: EventProposalInput) => Promise<void> | void;
};

export function ProposalForm({
  initialValues,
  submitLabel = "Speichern",
  isSaving,
  errorMessage,
  onSubmit,
}: ProposalFormProps) {
  const base = initialValues ?? emptyProposalInput();

  const [title, setTitle] = useState(base.title);
  const [shortDescription, setShortDescription] = useState(
    base.short_description ?? "",
  );
  const [longDescription, setLongDescription] = useState(
    base.long_description ?? "",
  );
  const [eventStart, setEventStart] = useState(
    toLocalDatetimeInputValue(base.event_start),
  );
  const [duration, setDuration] = useState(base.duration ?? "");
  const [meetingPoint, setMeetingPoint] = useState(base.meeting_point ?? "");
  const [costNote, setCostNote] = useState(base.cost_note ?? "");
  const [imagePath, setImagePath] = useState(base.image_path ?? "");
  const [status, setStatus] = useState<ProposalStatus>(base.status);
  const [isActive, setIsActive] = useState(base.is_active);
  const [sortOrder, setSortOrder] = useState<number>(base.sort_order);

  const [titleError, setTitleError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      setTitleError("Bitte gib einen Titel ein.");
      return;
    }
    setTitleError(null);

    const payload: EventProposalInput = {
      title: cleanedTitle,
      short_description: trimOrNull(shortDescription),
      long_description: trimOrNull(longDescription),
      event_start: fromLocalDatetimeInputValue(eventStart),
      duration: trimOrNull(duration),
      meeting_point: trimOrNull(meetingPoint),
      cost_note: trimOrNull(costNote),
      image_path: trimOrNull(imagePath),
      status,
      is_active: isActive,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };

    void onSubmit(payload);
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-50";
  const labelClass = "block text-sm font-medium text-slate-700 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className={labelClass}>
          Titel
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="z. B. Bootsausflug nach Es Trenc"
          disabled={isSaving}
        />
        {titleError && (
          <p className="mt-2 text-sm text-rose-700">{titleError}</p>
        )}
      </div>

      <div>
        <label htmlFor="short_description" className={labelClass}>
          Kurzbeschreibung
        </label>
        <input
          id="short_description"
          type="text"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className={inputClass}
          placeholder="Ein Satz fuer die Kartenansicht."
          disabled={isSaving}
        />
      </div>

      <div>
        <label htmlFor="long_description" className={labelClass}>
          Detailbeschreibung
        </label>
        <textarea
          id="long_description"
          rows={5}
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          className={inputClass}
          placeholder="Was machen wir, was sollten alle wissen?"
          disabled={isSaving}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event_start" className={labelClass}>
            Startzeitpunkt
          </label>
          <input
            id="event_start"
            type="datetime-local"
            value={eventStart}
            onChange={(e) => setEventStart(e.target.value)}
            className={inputClass}
            disabled={isSaving}
          />
          <p className="mt-1 text-xs text-slate-500">
            Optional. Lokale Zeit, wird als UTC gespeichert.
          </p>
        </div>

        <div>
          <label htmlFor="duration" className={labelClass}>
            Dauer
          </label>
          <input
            id="duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
            placeholder="z. B. ca. 3 h"
            disabled={isSaving}
          />
        </div>
      </div>

      <div>
        <label htmlFor="meeting_point" className={labelClass}>
          Treffpunkt
        </label>
        <input
          id="meeting_point"
          type="text"
          value={meetingPoint}
          onChange={(e) => setMeetingPoint(e.target.value)}
          className={inputClass}
          placeholder="z. B. Lobby El Arenal"
          disabled={isSaving}
        />
      </div>

      <div>
        <label htmlFor="cost_note" className={labelClass}>
          Kosten / Hinweis
        </label>
        <input
          id="cost_note"
          type="text"
          value={costNote}
          onChange={(e) => setCostNote(e.target.value)}
          className={inputClass}
          placeholder="z. B. ca. 35 EUR pro Person"
          disabled={isSaving}
        />
      </div>

      <div>
        <label htmlFor="image_path" className={labelClass}>
          Bildpfad oder Bild-URL
        </label>
        <input
          id="image_path"
          type="text"
          value={imagePath}
          onChange={(e) => setImagePath(e.target.value)}
          className={inputClass}
          placeholder="/images/events/bootsausflug.jpg oder https://..."
          disabled={isSaving}
        />
        <p className="mt-1 text-xs text-slate-500">
          Lokale Bilder unter <code>public/images/events/</code>. Externe
          URLs muessen in <code>next.config.mjs</code> erlaubt sein.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProposalStatus)}
            className={inputClass}
            disabled={isSaving}
          >
            {PROPOSAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {PROPOSAL_STATUS_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort_order" className={labelClass}>
            Sortierung
          </label>
          <input
            id="sort_order"
            type="number"
            inputMode="numeric"
            value={Number.isFinite(sortOrder) ? sortOrder : 0}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className={inputClass}
            disabled={isSaving}
          />
          <p className="mt-1 text-xs text-slate-500">
            Kleinere Zahl = weiter oben.
          </p>
        </div>

        <div>
          <span className={labelClass}>Sichtbarkeit</span>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSaving}
              className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
            />
            <span className="text-sm text-slate-700">
              {isActive ? "Aktiv (sichtbar)" : "Inaktiv (versteckt)"}
            </span>
          </label>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-4 text-base font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-sky-500 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Speichere...
          </>
        ) : (
          <>
            <Save size={18} />
            {submitLabel}
          </>
        )}
      </button>
    </form>
  );
}
