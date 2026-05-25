"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, Sparkles } from "lucide-react";

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error || "Passwort stimmt nicht.");
        setIsSubmitting(false);
        return;
      }

      const safeNext = next.startsWith("/") ? next : "/";
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es noch einmal.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-center gap-2 text-amber-700">
        <Sparkles size={18} />
        <span className="text-sm font-medium tracking-wide uppercase">
          Mallorca-Connect
        </span>
      </div>

      <div className="rounded-3xl bg-white/90 backdrop-blur p-7 shadow-card border border-white">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Willkommen an Bord
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Bitte gib das Crew-Passwort ein, um die Reise zu sehen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              inputMode="text"
              autoFocus
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              placeholder="••••••••"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || password.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-4 text-base font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Pruefe...
              </>
            ) : (
              "Reinkommen"
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Alles kann, nichts muss &mdash; kein Risiko, kein Drama.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-sky-100" />
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-amber-300/40 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
        <Suspense fallback={null}>
          <LoginCard />
        </Suspense>
      </div>
    </main>
  );
}
