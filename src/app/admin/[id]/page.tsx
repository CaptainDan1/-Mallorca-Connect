"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProposalForm } from "@/components/ProposalForm";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  type EventProposal,
  type EventProposalInput,
} from "@/lib/proposals";

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
    is_active: proposal.is_active,
    sort_order: proposal.sort_order,
  };
}

export default function EditProposalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [initial, setInitial] = useState<EventProposalInput | null>(null);
  const [proposalTitle, setProposalTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setInitial(toInput(proposal));
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

  async function handleSubmit(values: EventProposalInput) {
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
      const { error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .update(values)
        .eq("id", id);
      if (error) throw error;
      setProposalTitle(values.title);
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
        )}
      </div>
    </main>
  );
}
