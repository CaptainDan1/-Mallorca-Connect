"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  WandSparkles,
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

type SuggestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; imageUrl: string; source: "og" | "twitter" | "jsonld" }
  | { status: "failed"; reason: string };

type SuggestionApiResponse =
  | { ok: true; imageUrl: string; source: "og" | "twitter" | "jsonld" }
  | { ok: false; reason: string };

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
  // Bildvorschlaege pro row.index. Wird nach dem Parsen automatisch fuer
  // Zeilen mit sourceUrl, aber ohne imageUrl, vom API-Endpunkt geholt.
  const [suggestions, setSuggestions] = useState<Record<number, SuggestionState>>({});

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
        setSuggestions({});
        setParseError(result.error);
        setPhase("input");
        return;
      }
      setRows(result.rows);
      setSuggestions({});
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

  // Sobald die Vorschau da ist: fuer alle Zeilen mit Quelle aber ohne Bild
  // einen Bildvorschlag holen. Fehler blockieren nichts -- werden nur
  // als kleine Warnung in der Karte angezeigt.
  useEffect(() => {
    if (phase !== "preview") return;
    const toLoad = rows.filter(
      (row) =>
        row.payload &&
        row.payload.source_url &&
        !row.payload.image_path &&
        !suggestions[row.index],
    );
    if (toLoad.length === 0) return;

    let cancelled = false;
    setSuggestions((prev) => {
      const next = { ...prev };
      for (const row of toLoad) next[row.index] = { status: "loading" };
      return next;
    });

    for (const row of toLoad) {
      const url = row.payload?.source_url;
      if (!url) continue;
      const target = `/api/admin/image-suggestion?url=${encodeURIComponent(url)}`;
      fetch(target, { method: "GET", credentials: "same-origin" })
        .then(async (response) => {
          let data: SuggestionApiResponse | null = null;
          try {
            data = (await response.json()) as SuggestionApiResponse;
          } catch {
            data = null;
          }
          if (cancelled) return;
          if (data && data.ok) {
            setSuggestions((prev) => ({
              ...prev,
              [row.index]: {
                status: "ok",
                imageUrl: data.imageUrl,
                source: data.source,
              },
            }));
          } else {
            const reason =
              (data && !data.ok && data.reason) ||
              `HTTP ${response.status}`;
            setSuggestions((prev) => ({
              ...prev,
              [row.index]: { status: "failed", reason },
            }));
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const reason =
            error instanceof Error ? error.message : "Netzwerkfehler.";
          setSuggestions((prev) => ({
            ...prev,
            [row.index]: { status: "failed", reason },
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [phase, rows, suggestions]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
      setRows([]);
      setSuggestions({});
      setPhase("input");
      setParseError(null);
    } catch {
      setParseError("Datei konnte nicht gelesen werden.");
    }
  }

  function handleShowExample() {
    setRawText(IMPORT_EXAMPLE_JSON);
    setRows([]);
    setSuggestions({});
    setPhase("input");
    setParseError(null);
  }

  function handleReset() {
    setRawText("");
    setRows([]);
    setSuggestions({});
    setParseError(null);
    setSaveError(null);
    setSuccessCount(0);
    setPhase("input");
  }

  // Uebernimmt den Bildvorschlag in das Payload der Zeile und entfernt
  // die "Bild fehlt"-Warnung. Status der Zeile wird bei Bedarf neu
  // berechnet (ok / warning / error).
  function handleAdoptSuggestion(rowIndex: number, imageUrl: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.index !== rowIndex) return row;
        if (!row.payload) return row;
        const remainingIssues = row.issues.filter(
          (i) => i.message !== "Bild fehlt",
        );
        const hasError = remainingIssues.some((i) => i.level === "error");
        const nextStatus: ImportRow["status"] = hasError
          ? "error"
          : remainingIssues.length > 0
            ? "warning"
            : "ok";
        return {
          ...row,
          payload: { ...row.payload, image_path: imageUrl },
          issues: remainingIssues,
          status: nextStatus,
        };
      }),
    );
  }

  function handleDismissSuggestion(rowIndex: number) {
    setSuggestions((prev) => ({
      ...prev,
      [rowIndex]: { status: "failed", reason: "Vorschlag verworfen." },
    }));
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
      const message =
        error instanceof Error
          ? error.message
          : "Import hat leider nicht geklappt.";
      setSaveError(message);
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
            Hinweis: Bildvorschlaege werden aus der Quelle (og:image,
            twitter:image, JSON-LD) gelesen. Wir uebernehmen nur die URL —
            Bildrechte / Hotlinking bleiben in der Verantwortung des Admins.
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
                    <PreviewRow
                      key={row.index}
                      row={row}
                      suggestion={suggestions[row.index] ?? { status: "idle" }}
                      onAdoptSuggestion={handleAdoptSuggestion}
                      onDismissSuggestion={handleDismissSuggestion}
                    />
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
  suggestion: SuggestionState;
  onAdoptSuggestion: (rowIndex: number, imageUrl: string) => void;
  onDismissSuggestion: (rowIndex: number) => void;
};

function PreviewRow({
  row,
  suggestion,
  onAdoptSuggestion,
  onDismissSuggestion,
}: PreviewRowProps) {
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
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <ImageOff size={20} />
                </div>
              )}
            </div>
          </div>

          {/* Bildvorschlag aus Quelle, nur wenn (noch) kein Bild gesetzt ist
              und eine Quelle vorhanden ist. */}
          {!hasImage && payload?.source_url && (
            <SuggestionBlock
              rowIndex={row.index}
              title={title}
              suggestion={suggestion}
              onAdopt={onAdoptSuggestion}
              onDismiss={onDismissSuggestion}
            />
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

type SuggestionBlockProps = {
  rowIndex: number;
  title: string;
  suggestion: SuggestionState;
  onAdopt: (rowIndex: number, imageUrl: string) => void;
  onDismiss: (rowIndex: number) => void;
};

function SuggestionBlock({
  rowIndex,
  title,
  suggestion,
  onAdopt,
  onDismiss,
}: SuggestionBlockProps) {
  if (suggestion.status === "idle" || suggestion.status === "loading") {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-2.5 py-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" />
          Bildvorschlag wird aus der Quelle gelesen...
        </span>
      </div>
    );
  }

  if (suggestion.status === "failed") {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-2.5 py-2 text-[11px] text-amber-800">
        <span className="inline-flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>
            Bildvorschlag nicht ermittelbar
            {suggestion.reason ? ` (${suggestion.reason})` : ""}.
          </span>
        </span>
      </div>
    );
  }

  // ok
  return (
    <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-2">
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="aspect-[16/9] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={suggestion.imageUrl}
            alt={`Bildvorschlag fuer ${title}`}
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              // Wenn das Bild nicht laedt: leise auf "failed" umschalten,
              // damit der Admin sieht, dass die URL nicht nutzbar ist.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-500">
        Quelle:{" "}
        <span className="font-medium text-slate-700">
          {labelForSource(suggestion.source)}
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onAdopt(rowIndex, suggestion.imageUrl)}
          className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-soft transition hover:bg-sky-700"
        >
          <WandSparkles size={11} />
          Bildvorschlag uebernehmen
        </button>
        <button
          type="button"
          onClick={() => onDismiss(rowIndex)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Ignorieren
        </button>
      </div>
    </div>
  );
}

function labelForSource(source: "og" | "twitter" | "jsonld"): string {
  switch (source) {
    case "og":
      return "og:image";
    case "twitter":
      return "twitter:image";
    case "jsonld":
      return "JSON-LD";
  }
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
