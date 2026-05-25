"use client";

import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { VoteForm } from "@/components/VoteForm";
import { CrewList } from "@/components/CrewList";
import { Toast, type ToastVariant } from "@/components/Toast";
import { useVotes } from "@/hooks/useVotes";

type ToastState = { message: string; variant: ToastVariant } | null;

export default function HomePage() {
  const {
    votes,
    isLoading,
    isSaving,
    loadError,
    saveError,
    isConfigured,
    saveVote,
  } = useVotes();
  const [toast, setToast] = useState<ToastState>(null);

  async function handleSubmit(input: Parameters<typeof saveVote>[0]) {
    const result = await saveVote(input);
    if (result) {
      setToast({
        message: "Deine Auswahl ist gespeichert.",
        variant: "success",
      });
    } else {
      setToast({
        message:
          saveError ||
          "Das hat leider nicht geklappt. Bitte versuche es noch einmal.",
        variant: "error",
      });
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <HeroSection />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-12 sm:-mt-16 pb-16 space-y-6 relative">
        {!isConfigured && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-soft">
            <p className="font-medium">Supabase ist noch nicht verbunden.</p>
            <p className="mt-1 text-amber-800/90">
              Bitte <code>NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in den
              Environment-Variablen setzen.
            </p>
          </div>
        )}

        <VoteForm
          onSubmit={handleSubmit}
          isSaving={isSaving}
          errorMessage={saveError}
          disabled={!isConfigured}
        />

        <CrewList
          votes={votes}
          isLoading={isLoading}
          errorMessage={loadError}
        />

        <footer className="pt-4 text-center text-xs text-slate-400">
          Mallorca-Connect &middot; Alles kann, nichts muss.
        </footer>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
