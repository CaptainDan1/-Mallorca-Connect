import { ShieldCheck } from "lucide-react";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-24">
        <div className="rounded-3xl bg-white p-7 shadow-card border border-white">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-soft">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Adminbereich bereit.
              </h1>
              <p className="text-sm text-slate-600">
                Vorschlaege werden im naechsten Schritt verwaltet.
              </p>
            </div>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Du bist als Admin eingeloggt. Hier entsteht in Kuerze die
            Verwaltung der Event-Vorschlaege.
          </p>
        </div>
      </div>
    </main>
  );
}
