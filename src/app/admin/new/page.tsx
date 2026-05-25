"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProposalForm } from "@/components/ProposalForm";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  type EventProposal,
  type EventProposalInput,
} from "@/lib/proposals";
import { uploadEventImage } from "@/lib/storage";

export default function NewProposalPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(
    values: EventProposalInput,
    file: File | null,
  ) {
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .insert(values)
        .select("id")
        .single();
      if (error) throw error;
      const inserted = data as Pick<EventProposal, "id"> | null;

      if (file && inserted?.id) {
        const { publicUrl } = await uploadEventImage(inserted.id, file);
        const { error: updateError } = await supabase
          .from(EVENT_PROPOSALS_TABLE)
          .update({ image_path: publicUrl })
          .eq("id", inserted.id);
        if (updateError) throw updateError;
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Speichern hat leider nicht geklappt.";
      setErrorMessage(message);
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
            Neuer Vorschlag
          </h1>
          <p className="text-sm text-slate-600">
            Beschreib den Vorschlag so, dass die Crew sofort versteht,
            worum es geht.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-card border border-white">
          <ProposalForm
            isSaving={isSaving}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
            submitLabel="Vorschlag anlegen"
          />
        </div>
      </div>
    </main>
  );
}
