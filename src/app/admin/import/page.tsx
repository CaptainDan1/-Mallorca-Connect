"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  FileText,
  ImageOff,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  DISCOVERY_TAG_BADGE,
  EVENT_PROPOSALS_TABLE,
  LOCATION_AREA_BADGE,
  type EventProposal,
} from "@/lib/proposals";
import {
  IMPORT_EXAMPLE_JSON,
  parseImportInput,
  type ImportRow,
} from "@/lib/proposalImport";

type ImportPhase = "input" | "preview" | "saving" | "done";

export default function AdminImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rawText, setRawText] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [phase, setPhase] = useState<ImportPhase>("input");
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number>(0);

  const counts = useMemo(() => {
    const result = { ok: 0, warning: 0, error: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "ok") result.ok += 1;
      else if (r.status === "warning") result.warning += 1;
      else result.error += 1;
    }
    return result;
  }, [rows]);

  const importable = useMemo(
    () => rows.filter((r) => r.status !== "error" && r.payload != null),
    [rows],
  );

  const handlePreview = useCallback(async () => {
    setParseError(null);
    setSaveError(null);

    if (!isSupabaseConfigured()) {
      setParseError(
        "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
      );
      return;
    }

    setIsLoadingExisting(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .select("title");
      if (error) throw error;
      const existingTitles = ((data as { title: string }[]) ?? []).map(
        (d) => d.title,
      );
      const result = parseImportInput({ raw: rawText, existingTitles });
      if (!result.ok) {
        setRows([]);
        setParseError(result.error);
        setPhase("input");
        return;
      }
      setRows(result.rows);
      setPhase("preview");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Vorschau konnte nicht erzeugt werden.";
      setParseError(message);
    } finally {
      setIsLoadingExisting(false);
    }
  }, [rawText]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
      setRows([]);
      setPhase("input");
      setParseError(null);
    } catch {
      setParseError("Datei konnte nicht gelesen werden.");
    }
  }

  function handleShowExample() {
    setRawText(IMPORT_EXAMPLE_JSON);
    setRows([]);
    setPhase("input");
    setParseError(null);
  }

  function handleReset() {
    setRawText("");
    setRows([]);
    setParseError(null);
    setSaveError(null);
    setSuccessCount(0);
    setPhase("input");
  }

  async function handleImport() {
    if (importable.length === 0) return;
    if (!isSupabaseConfigured()) {
      setSaveError("Supabase ist nicht konfiguriert.");
      return;
    }
    setPhase("saving");
    setSaveError(null);
    try {
      const supabase = getSupabaseClient();
      const payloads = importable.map((r) => r.payload!);
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .insert(payloads)
        .select("id");
      if (error) throw error;
      const inserted = (data as Pick<EventProposal, "id">[] | null) ?? [];
      setSuccessCount(inserted.length);
      setPhase("done");
    } catch (error) {
      setSaveError(formatImportError(error));
      setPhase("preview");
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-10 pb-24 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Zurueck zur Uebersicht
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Aktivitaeten importieren
          </h1>
          <p className="text-sm text-slate-600">
            Mehrere Aktivitaeten als JSON einfuegen oder als Datei hochladen.
            Importierte Eintraege landen als <strong>Entwurf</strong> (pending,
            inaktiv) und erscheinen erst nach Freigabe oeffentlich.
          </p>
          <p className="text-xs text-slate-500">
            Bilder sind optional. Aktivitaeten ohne Bild lassen sich
            spaeter im Admin nachpflegen.
          </p>
        </header>

        {phase === "done" ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 shadow-soft">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 text-emerald-600" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-emerald-900">
                  {successCount}{" "}
                  {successCount === 1 ? "Aktivitaet" : "Aktivitaeten"}{" "}
                  als Entwurf importiert.
                </p>
                <p className="text-sm text-emerald-800/90">
                  Die Vorschlaege liegen jetzt im Adminbereich unter
                  &bdquo;Wartet auf Freigabe&ldquo;. Erst nach deiner Freigabe
                  werden sie oeffentlich.
                </p>
                <div className="flex flex-wrap gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => router.replace("/admin")}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700"
                  >
                    Zur Uebersicht
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
                  >
                    Weiteren Import starten
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="space-y-4 rounded-3xl border border-white bg-white p-5 sm:p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  1. JSON einfuegen oder hochladen
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleShowExample}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
                  >
                    <Sparkles size={12} />
                    Beispiel anzeigen
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
                  >
                    <CloudUpload size={12} />
                    JSON-Datei waehlen
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json,text/plain,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  if (phase !== "input") setPhase("input");
                }}
                rows={12}
                spellCheck={false}
                placeholder='[ { "title": "Es Trenc Beach Day", ... } ]'
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />

              {parseError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {parseError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={isLoadingExisting || rawText.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-sky-500 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingExisting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  Vorschau anzeigen
                </button>
                {phase !== "input" && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
                  >
                    Zuruecksetzen
                  </button>
                )}
              </div>
            </section>

            {rows.length > 0 && (
              <section className="space-y-4 rounded-3xl border border-white bg-white p-5 sm:p-6 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    2. Vorschau
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-100">
                      <CheckCircle2 size={12} />
                      {counts.ok} OK
                    </span>
                    {counts.warning > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-100">
                        <AlertTriangle size={12} />
                        {counts.warning} Warnung
                        {counts.warning === 1 ? "" : "en"}
                      </span>
                    )}
                    {counts.error > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-medium text-rose-800 ring-1 ring-rose-100">
                        <XCircle size={12} />
                        {counts.error} Fehler
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3">
                  {rows.map((row) => (
                    <PreviewRow key={row.index} row={row} />
                  ))}
                </ul>

                {saveError && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  >
                    {saveError}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => void handleImport()}
                    disabled={
                      phase === "saving" ||
                      importable.length === 0 ||
                      (counts.error > 0 && counts.ok + counts.warning === 0)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {phase === "saving" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Importiere...
                      </>
                    ) : (
                      <>
                        Als Entwurf importieren ({importable.length})
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-500">
                    Fehlerhafte Eintraege werden uebersprungen. Warnungen
                    werden mit importiert.
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

type PreviewRowProps = {
  row: ImportRow;
};

function PreviewRow({ row }: PreviewRowProps) {
  const payload = row.payload;
  const title =
    payload?.title ?? (typeof row.raw.title === "string" ? row.raw.title : "");
  const category = payload?.category ?? null;
  const location = payload?.location_area ?? null;
  const hasImage = Boolean(payload?.image_path);

  const statusBadge =
    row.status === "ok" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-100">
        <CheckCircle2 size={11} />
        OK
      </span>
    ) : row.status === "warning" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-100">
        <AlertTriangle size={11} />
        Warnung
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 ring-1 ring-rose-100">
        <XCircle size={11} />
        Fehler
      </span>
    );

  return (
    <li
      className={
        "rounded-2xl border p-4 shadow-soft transition " +
        (row.status === "error"
          ? "border-rose-200 bg-rose-50/40"
          : row.status === "warning"
            ? "border-amber-200 bg-amber-50/40"
            : "border-slate-200 bg-white")
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-48 sm:flex-shrink-0 space-y-2">
          <div className="relative w-full overflow-hidden rounded-xl bg-stone-100">
            <div className="aspect-[16/9] w-full">
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={payload?.image_path as string}
                  alt={title}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                  <ImageOff size={18} />
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    Ohne Bild
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bild ist optional. Wir zaehlen das nicht als Warnung -- nur
              ein dezenter Hinweis, dass der Admin es spaeter ergaenzen
              kann. */}
          {!hasImage && (
            <p className="text-[10px] leading-snug text-slate-500">
              Bild kann spaeter im Admin ergaenzt werden.
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              #{row.index}
            </span>
            {statusBadge}
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {title || <em className="text-slate-400">ohne Titel</em>}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {location && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ${LOCATION_AREA_BADGE[location] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}
              >
                {location}
              </span>
            )}
            {category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {category}
              </span>
            )}
            {payload?.tags?.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ${DISCOVERY_TAG_BADGE[tag]}`}
              >
                #{tag}
              </span>
            ))}
          </div>

          {payload && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
              {payload.duration && (
                <KV label="Zeiten" value={payload.duration} />
              )}
              {payload.meeting_point && (
                <KV label="Treffpunkt" value={payload.meeting_point} />
              )}
              {payload.cost_note && (
                <KV label="Kosten" value={payload.cost_note} />
              )}
              {payload.source_url && (
                <KV
                  label="Quelle"
                  value={
                    /* Externe URL: bewusst als natives <a>, nicht ueber
                       Next <Link>, damit kein /admin/...-Relativlink
                       entsteht. */
                    <a
                      href={payload.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 underline hover:text-sky-800"
                    >
                      {prettyHost(payload.source_url)}
                      <ExternalLink size={10} />
                    </a>
                  }
                />
              )}
              {payload.image_path && (
                <KV
                  label="Bild"
                  value={
                    <a
                      href={payload.image_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 underline hover:text-sky-800"
                    >
                      {prettyHost(payload.image_path)}
                      <ExternalLink size={10} />
                    </a>
                  }
                />
              )}
            </dl>
          )}

          {row.issues.length > 0 && (
            <ul className="flex flex-col gap-1 text-[11px]">
              {row.issues.map((issue, idx) => (
                <li
                  key={idx}
                  className={
                    "inline-flex items-start gap-1.5 " +
                    (issue.level === "error"
                      ? "text-rose-700"
                      : "text-amber-800")
                  }
                >
                  {issue.level === "error" ? (
                    <XCircle size={12} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  )}
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

// Liest aus dem Supabase-Fehlerobjekt alle nuetzlichen Felder aus
// (message, details, hint, code) und ergaenzt eine Empfehlung, falls es
// nach fehlender Spalte / kaltem Schema-Cache aussieht. So sieht der
// Admin in der UI sofort, was zu tun ist (z.B. Migration ausfuehren).
function formatImportError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Import hat leider nicht geklappt.";
  }
  const e = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };
  const parts: string[] = [];
  if (typeof e.message === "string" && e.message.trim()) {
    parts.push(e.message.trim());
  }
  if (typeof e.details === "string" && e.details.trim()) {
    parts.push(`Details: ${e.details.trim()}`);
  }
  if (typeof e.hint === "string" && e.hint.trim()) {
    parts.push(`Hinweis: ${e.hint.trim()}`);
  }
  if (typeof e.code === "string" && e.code.trim()) {
    parts.push(`Code: ${e.code.trim()}`);
  }
  if (parts.length === 0) {
    parts.push("Import hat leider nicht geklappt.");
  }
  const fingerprint = parts.join(" ").toLowerCase();
  // Klassische PostgREST-Symptome bei fehlender Spalte: "column ... does
  // not exist", "could not find the 'tags' column", "schema cache".
  const looksLikeMissingColumn =
    /column\s+["']?(tags|category|location_area|source_url)["']?/i.test(
      fingerprint,
    ) ||
    /could not find.*column/i.test(fingerprint) ||
    /schema cache/i.test(fingerprint) ||
    /pgrst\d+/i.test(fingerprint);
  if (looksLikeMissingColumn) {
    parts.push(
      "Bitte 00 Documentation/supabase/add-import-metadata.sql im Supabase SQL-Editor ausfuehren und Import erneut versuchen.",
    );
  }
  return `Import fehlgeschlagen: ${parts.join(" — ")}`;
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
