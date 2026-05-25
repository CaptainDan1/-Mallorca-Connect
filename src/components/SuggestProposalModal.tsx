"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send, X } from "lucide-react";
import { ProposalImagePicker } from "@/components/ProposalImagePicker";
import { getSupabaseClient } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  fromLocalDatetimeInputValue,
  trimOrNull,
} from "@/lib/proposals";
import { uploadEventImage } from "@/lib/storage";

type SuggestProposalModalProps = {
  participantId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function SuggestProposalModal({
  participantId,
  onClose,
  onSuccess,
}: SuggestProposalModalProps) {
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [duration, setDuration] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [costNote, setCostNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSaving) onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, isSaving]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      setErrorMessage("Bitte gib einen Titel ein.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participantId,
          title: cleanedTitle,
          short_description: trimOrNull(shortDescription),
          long_description: trimOrNull(longDescription),
          event_start: fromLocalDatetimeInputValue(eventStart),
          duration: trimOrNull(duration),
          meeting_point: trimOrNull(meetingPoint),
          cost_note: trimOrNull(costNote),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        proposal_id?: string;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.proposal_id) {
        throw new Error(
          data.error || "Vorschlag konnte nicht gespeichert werden.",
        );
      }

      if (file) {
        const proposalId = data.proposal_id;
        const { publicUrl } = await uploadEventImage(proposalId, file);
        const supabase = getSupabaseClient();
        const { error: updateError } = await supabase
          .from(EVENT_PROPOSALS_TABLE)
          .update({ image_path: publicUrl })
          .eq("id", proposalId);
        if (updateError) {
          // Foto-Upload fehlgeschlagen, aber Vorschlag ist da. Sag das
          // dem Nutzer, ohne den Flow scheitern zu lassen.
          setSuccessMessage(
            "Danke! Dein Vorschlag wurde eingereicht und wartet auf Freigabe. Hinweis: Das Foto konnte nicht gespeichert werden -- der Admin kann es nachtragen.",
          );
          if (onSuccess) onSuccess();
          setIsSaving(false);
          return;
        }
      }

      setSuccessMessage(
        "Danke! Dein Vorschlag wurde eingereicht und wartet auf Freigabe.",
      );
      if (onSuccess) onSuccess();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Vorschlag konnte nicht gespeichert werden.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50";
  const labelClass = "block text-sm font-medium text-slate-700 mb-2";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vorschlag machen"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Vorschlag machen
            </h2>
            <p className="text-xs text-slate-500">
              Dein Vorschlag wird zunaechst vom Admin geprueft.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            disabled={isSaving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            aria-label="Schliessen"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {successMessage ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <div>
                <p>{successMessage}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  Schliessen
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="s-title" className={labelClass}>
                  Titel
                </label>
                <input
                  id="s-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  placeholder="z. B. Sundowner am Strand"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="s-short" className={labelClass}>
                  Kurzbeschreibung
                </label>
                <input
                  id="s-short"
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className={inputClass}
                  placeholder="Worum geht's in einem Satz?"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="s-long" className={labelClass}>
                  Detailbeschreibung
                </label>
                <textarea
                  id="s-long"
                  rows={4}
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  className={inputClass}
                  placeholder="Mehr Kontext, falls noetig."
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="s-start" className={labelClass}>
                    Startzeitpunkt (optional)
                  </label>
                  <input
                    id="s-start"
                    type="datetime-local"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className={inputClass}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label htmlFor="s-duration" className={labelClass}>
                    Dauer (optional)
                  </label>
                  <input
                    id="s-duration"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={inputClass}
                    placeholder="z. B. ca. 2 h"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="s-meet" className={labelClass}>
                  Treffpunkt (optional)
                </label>
                <input
                  id="s-meet"
                  type="text"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  className={inputClass}
                  placeholder="z. B. Hafen Cala Ratjada"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="s-cost" className={labelClass}>
                  Kosten / Hinweis (optional)
                </label>
                <input
                  id="s-cost"
                  type="text"
                  value={costNote}
                  onChange={(e) => setCostNote(e.target.value)}
                  className={inputClass}
                  placeholder="z. B. nur Getraenke"
                  disabled={isSaving}
                />
              </div>

              <div>
                <span className={labelClass}>Foto (optional)</span>
                <ProposalImagePicker
                  disabled={isSaving}
                  onFileChange={setFile}
                  isUploading={isSaving && file != null}
                />
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-4 text-base font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sende...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Vorschlag einreichen
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
