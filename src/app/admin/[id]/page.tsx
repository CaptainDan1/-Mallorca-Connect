"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProposalForm } from "@/components/ProposalForm";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  PROPOSAL_MODERATION_LABELS,
  type EventProposal,
  type EventProposalInput,
  type ProposalModerationStatus,
} from "@/lib/proposals";
import {
  PARTICIPANTS_TABLE,
  type ParticipantProfile,
} from "@/lib/participants";
import { uploadEventImage } from "@/lib/storage";

function toInput(proposal: EventProposal): EventProposalInput {
  return {
    title: proposal.title,
    short_description: proposal.short_description,
    long_description: proposal.long_description,
    event_start: proposal.event_start,
    duration: proposal.duration,
    meeting_point: proposal.meeting_point,
    cost_note: proposal.cost_note,
    image_path: proposal.image_path,
    status: proposal.status,
    moderation_status: proposal.moderation_status,
    is_active: proposal.is_active,
    sort_order: proposal.sort_order,
    scheduled_day: proposal.scheduled_day,
    scheduled_slot: proposal.scheduled_slot,
    min_participants: proposal.min_participants,
    capacity: proposal.capacity,
    plan_note: proposal.plan_note,
    location_area: proposal.location_area,
    category: proposal.category,
    source_url: proposal.source_url,
    tags: proposal.tags ?? [],
  };
}

export default function EditProposalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [initial, setInitial] = useState<EventProposalInput | null>(null);
  const [proposalTitle, setProposalTitle] = useState<string>("");
  const [moderationStatus, setModerationStatus] =
    useState<ProposalModerationStatus | null>(null);
  const [submitter, setSubmitter] = useState<ParticipantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quickActionBusy, setQuickActionBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    if (!isSupabaseConfigured()) {
      setLoadError(
        "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setLoadError("Dieser Vorschlag existiert nicht (mehr).");
        return;
      }
      const proposal = data as EventProposal;
      setProposalTitle(proposal.title);
      setModerationStatus(proposal.moderation_status);
      setInitial(toInput(proposal));

      if (proposal.submitted_by_participant_id) {
        const { data: profile } = await supabase
          .from(PARTICIPANTS_TABLE)
          .select("id, display_name, hotel_info, avatar_url")
          .eq("id", proposal.submitted_by_participant_id)
          .maybeSingle();
        setSubmitter((profile as ParticipantProfile) ?? null);
      } else {
        setSubmitter(null);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Vorschlag konnte nicht geladen werden.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(
    values: EventProposalInput,
    file: File | null,
  ) {
    if (!id) return;
    if (!isSupabaseConfigured()) {
      setSaveError(
        "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
      );
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const supabase = getSupabaseClient();

      let payload = values;
      if (file) {
        const { publicUrl } = await uploadEventImage(id, file);
        payload = { ...values, image_path: publicUrl };
      }

      const { error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      setProposalTitle(payload.title);
      setModerationStatus(payload.moderation_status);
      setInitial(payload);
      setSuccessMessage("Aenderungen gespeichert.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Speichern hat leider nicht geklappt.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function applyQuickAction(action: "approve" | "reject") {
    if (!id || quickActionBusy) return;
    setQuickActionBusy(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const supabase = getSupabaseClient();
      const update =
        action === "approve"
          ? { moderation_status: "approved" as const, is_active: true }
          : { moderation_status: "rejected" as const, is_active: false };

      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .update(update)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      const proposal = data as EventProposal;
      setInitial(toInput(proposal));
      setModerationStatus(proposal.moderation_status);
      setSuccessMessage(
        action === "approve"
          ? "Vorschlag freigegeben."
          : "Vorschlag abgelehnt.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Aktion hat nicht geklappt.";
      setSaveError(message);
    } finally {
      setQuickActionBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-24 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Zurueck zur Uebersicht
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Vorschlag bearbeiten
          </h1>
          {proposalTitle && (
            <p className="text-sm text-slate-600">{proposalTitle}</p>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 rounded-3xl bg-white px-6 py-8 text-sm text-slate-600 shadow-soft">
            <Loader2 size={18} className="animate-spin" />
            Lade Vorschlag...
          </div>
        )}

        {loadError && !isLoading && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {loadError}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => router.replace("/admin")}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Zurueck zur Uebersicht
              </button>
            </div>
          </div>
        )}

        {!isLoading && !loadError && initial && (
          <>
            {moderationStatus === "pending" && (
              <div className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 shadow-soft">
                <p className="text-sm font-semibold text-sky-900">
                  Wartet auf Freigabe
                </p>
                {submitter && (
                  <p className="mt-1 text-sm text-sky-900/80">
                    Eingereicht von{" "}
                    <span className="font-medium">
                      {submitter.display_name}
                    </span>
                    {submitter.hotel_info ? ` (${submitter.hotel_info})` : ""}.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyQuickAction("approve")}
                    disabled={quickActionBusy}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {quickActionBusy && <Loader2 size={14} className="animate-spin" />}
                    Freigeben
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickAction("reject")}
                    disabled={quickActionBusy}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-soft transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            )}

            {moderationStatus &&
              moderationStatus !== "pending" &&
              submitter && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-soft">
                  Eingereicht von{" "}
                  <span className="font-medium text-slate-800">
                    {submitter.display_name}
                  </span>
                  {submitter.hotel_info ? ` (${submitter.hotel_info})` : ""}.
                  Aktueller Freigabe-Status:{" "}
                  <span className="font-medium">
                    {PROPOSAL_MODERATION_LABELS[moderationStatus]}
                  </span>
                  .
                </div>
              )}

            <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-card border border-white space-y-4">
              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {successMessage}
                </div>
              )}
              <ProposalForm
                initialValues={initial}
                isSaving={isSaving}
                errorMessage={saveError}
                onSubmit={handleSubmit}
                submitLabel="Aenderungen speichern"
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
