"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Hotel,
  KeyRound,
  Mail,
  ImageOff,
  Loader2,
  LogIn,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

type AdminCredentialSummary = {
  participant_id: string;
  email: string;
  last_login_at: string | null;
};
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_VOTES_TABLE,
  PARTICIPANTS_TABLE,
  type ParticipantProfile,
} from "@/lib/participants";
import { EVENT_INTEREST_TABLE } from "@/lib/interest";
import { avatarGradient, getInitials } from "@/lib/utils";

type FilterKey = "all" | "with_photo" | "without_photo" | "active" | "inactive";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "with_photo", label: "Mit Foto" },
  { key: "without_photo", label: "Ohne Foto" },
  { key: "active", label: "War aktiv" },
  { key: "inactive", label: "Noch ohne Aktivitaet" },
];

type ParticipantRow = ParticipantProfile & {
  interestCount: number;
  voteIn: number;
  voteMaybe: number;
  voteOut: number;
  lastActivity: string | null;
  // Aus participant_credentials. Nur fuer Admin sichtbar, niemals oeffentlich.
  email: string | null;
  lastLoginAt: string | null;
  hasCredentials: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatRelativeDe(value: string | null | undefined): string {
  if (!value) return "Noch keine Aktivitaet";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "Noch keine Aktivitaet";
  const now = new Date();
  const date = new Date(ts);
  const today = startOfLocalDay(now);
  const day = startOfLocalDay(date);
  const diffDays = Math.round((today.getTime() - day.getTime()) / DAY_MS);
  const time = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (diffDays === 0) return `Heute, ${time}`;
  if (diffDays === 1) return `Gestern, ${time}`;
  if (diffDays > 1 && diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateDe(value: string | null | undefined): string {
  if (!value) return "-";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "-";
  return new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: number | null = null;
  for (const v of values) {
    if (!v) continue;
    const ts = Date.parse(v);
    if (Number.isNaN(ts)) continue;
    if (best === null || ts > best) best = ts;
  }
  return best === null ? null : new Date(best).toISOString();
}

function matchesFilter(row: ParticipantRow, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "with_photo":
      return Boolean(row.avatar_url);
    case "without_photo":
      return !row.avatar_url;
    case "active":
      return (
        row.interestCount > 0 ||
        row.voteIn + row.voteMaybe + row.voteOut > 0
      );
    case "inactive":
      return (
        row.interestCount === 0 &&
        row.voteIn + row.voteMaybe + row.voteOut === 0
      );
  }
}

function matchesSearch(row: ParticipantRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (row.display_name.toLowerCase().includes(q)) return true;
  if ((row.hotel_info ?? "").toLowerCase().includes(q)) return true;
  if ((row.email ?? "").toLowerCase().includes(q)) return true;
  if (row.id.toLowerCase().includes(q)) return true;
  return false;
}

export default function AdminTeilnehmerPage() {
  const configured = isSupabaseConfigured();

  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<ParticipantRow | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured) {
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
      const [participantsRes, votesRes, interestRes, credentialsRes] =
        await Promise.all([
          supabase
            .from(PARTICIPANTS_TABLE)
            .select(
              "id, display_name, hotel_info, avatar_url, last_seen_at, created_at, updated_at",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from(EVENT_VOTES_TABLE)
            .select("participant_id, vote, created_at, updated_at"),
          supabase
            .from(EVENT_INTEREST_TABLE)
            .select("participant_id, created_at"),
          // Credentials kommen ueber eine serverseitige Admin-Route,
          // weil participant_credentials per RLS fuer anon dicht ist.
          fetch("/api/admin/participants/credentials", {
            credentials: "same-origin",
          }),
        ]);

      if (participantsRes.error) throw participantsRes.error;

      // Credentials sind ein "nice to have" -- wenn die Route z.B.
      // mangels SUPABASE_SERVICE_ROLE_KEY fehlschlaegt, zeigen wir die
      // Teilnehmer trotzdem an, ohne E-Mail/Login.
      let credentialMap = new Map<string, AdminCredentialSummary>();
      if (credentialsRes.ok) {
        try {
          const payload = (await credentialsRes.json()) as
            | { ok: true; credentials: AdminCredentialSummary[] }
            | { ok: false; error: string };
          if (payload.ok) {
            credentialMap = new Map(
              payload.credentials.map((c) => [c.participant_id, c]),
            );
          }
        } catch {
          // ignorieren -- ohne Credential-Daten lassen wir die Spalte leer.
        }
      }

      type VoteAggregate = {
        in: number;
        maybe: number;
        out: number;
        latest: string | null;
      };
      const voteMap = new Map<string, VoteAggregate>();
      for (const v of (votesRes.data as Array<{
        participant_id: string;
        vote: "in" | "maybe" | "out";
        created_at: string | null;
        updated_at: string | null;
      }>) ?? []) {
        const bucket =
          voteMap.get(v.participant_id) ?? {
            in: 0,
            maybe: 0,
            out: 0,
            latest: null,
          };
        if (v.vote === "in") bucket.in += 1;
        else if (v.vote === "maybe") bucket.maybe += 1;
        else bucket.out += 1;
        bucket.latest = maxIso([bucket.latest, v.updated_at, v.created_at]);
        voteMap.set(v.participant_id, bucket);
      }

      const interestMap = new Map<
        string,
        { count: number; latest: string | null }
      >();
      for (const i of (interestRes.data as Array<{
        participant_id: string;
        created_at: string | null;
      }>) ?? []) {
        const bucket =
          interestMap.get(i.participant_id) ?? {
            count: 0,
            latest: null,
          };
        bucket.count += 1;
        bucket.latest = maxIso([bucket.latest, i.created_at]);
        interestMap.set(i.participant_id, bucket);
      }

      const list = (participantsRes.data as ParticipantProfile[]) ?? [];
      const enriched: ParticipantRow[] = list.map((p) => {
        const v = voteMap.get(p.id) ?? {
          in: 0,
          maybe: 0,
          out: 0,
          latest: null,
        };
        const i = interestMap.get(p.id) ?? { count: 0, latest: null };
        const credential = credentialMap.get(p.id) ?? null;
        const lastActivity = maxIso([
          v.latest,
          i.latest,
          credential?.last_login_at ?? null,
          p.last_seen_at,
          p.updated_at,
        ]);
        return {
          ...p,
          interestCount: i.count,
          voteIn: v.in,
          voteMaybe: v.maybe,
          voteOut: v.out,
          lastActivity,
          email: credential?.email ?? null,
          lastLoginAt: credential?.last_login_at ?? null,
          hasCredentials: Boolean(credential),
        };
      });
      setRows(enriched);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Teilnehmer konnten nicht geladen werden.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => matchesFilter(r, filter))
        .filter((r) => matchesSearch(r, query)),
    [rows, filter, query],
  );

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      all: rows.length,
      with_photo: 0,
      without_photo: 0,
      active: 0,
      inactive: 0,
    };
    for (const r of rows) {
      if (r.avatar_url) result.with_photo += 1;
      else result.without_photo += 1;
      const hasActivity =
        r.interestCount > 0 || r.voteIn + r.voteMaybe + r.voteOut > 0;
      if (hasActivity) result.active += 1;
      else result.inactive += 1;
    }
    return result;
  }, [rows]);

  async function handleCopyId(id: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(id);
      }
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1500);
    } catch {
      // still: kein Crash, kein Hinweis.
    }
  }

  async function handleDelete(row: ParticipantRow) {
    if (busyId) return;
    setBusyId(row.id);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/admin/participants/${encodeURIComponent(row.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.ok) {
        const message =
          payload?.error ??
          `Server antwortete unerwartet (HTTP ${response.status}).`;
        setActionError(message);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setActionSuccess(`Teilnehmer "${row.display_name}" wurde geloescht.`);
      setConfirmTarget(null);
      window.setTimeout(() => setActionSuccess(null), 4000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Loeschen hat nicht geklappt.";
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-24 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-soft">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Teilnehmer verwalten
              </h1>
              <p className="text-sm text-slate-600">
                Wer ist dabei, wer war zuletzt da, wer kann raus.
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Zurueck
          </Link>
        </header>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {isLoading
              ? "Lade Teilnehmer..."
              : `${counts.all} Teilnehmer insgesamt, ${counts.active} mit Aktivitaet.`}
          </p>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suche nach Name, Hotel, E-Mail oder ID..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition " +
                  (active
                    ? "bg-slate-900 text-white shadow-soft"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")
                }
              >
                <span>{f.label}</span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs " +
                    (active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600")
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {actionSuccess && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {actionError}
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {loadError}
          </div>
        )}

        {!isLoading && filtered.length === 0 && !loadError && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-base font-medium text-slate-700">
              {query.trim()
                ? "Keine Treffer fuer deine Suche."
                : "Keine Teilnehmer in dieser Ansicht."}
            </p>
            {!query.trim() && (
              <p className="mt-1 text-sm text-slate-500">
                Sobald sich jemand in der App anmeldet, taucht er hier auf.
              </p>
            )}
          </div>
        )}

        <ul className="space-y-3">
          {filtered.map((row) => (
            <ParticipantCard
              key={row.id}
              row={row}
              busy={busyId === row.id}
              copied={copiedId === row.id}
              onCopyId={() => void handleCopyId(row.id)}
              onDelete={() => setConfirmTarget(row)}
            />
          ))}
        </ul>
      </div>

      {confirmTarget && (
        <ConfirmDeleteModal
          target={confirmTarget}
          isBusy={busyId === confirmTarget.id}
          error={actionError}
          onCancel={() => {
            if (busyId) return;
            setConfirmTarget(null);
            setActionError(null);
          }}
          onConfirm={() => void handleDelete(confirmTarget)}
        />
      )}
    </main>
  );
}

type ParticipantCardProps = {
  row: ParticipantRow;
  busy: boolean;
  copied: boolean;
  onCopyId: () => void;
  onDelete: () => void;
};

function ParticipantCard({
  row,
  busy,
  copied,
  onCopyId,
  onDelete,
}: ParticipantCardProps) {
  const initials = getInitials(row.display_name);
  const gradient = avatarGradient(row.display_name || row.id);
  const totalVotes = row.voteIn + row.voteMaybe + row.voteOut;
  const hasActivity = row.interestCount > 0 || totalVotes > 0;

  return (
    <li className="relative rounded-3xl border border-white bg-white p-5 shadow-card">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        aria-label={`Teilnehmer ${row.display_name} loeschen`}
        title="Teilnehmer loeschen"
        className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-soft transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Trash2 size={15} />
        )}
      </button>

      <div className="flex items-start gap-4 pr-12">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-base font-semibold text-white shadow-soft`}
        >
          {row.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatar_url}
              alt={row.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {row.display_name}
            </h2>
            {!row.avatar_url && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                <ImageOff size={11} />
                Kein Foto
              </span>
            )}
            {!hasActivity && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Noch ruhig
              </span>
            )}
            {row.hasCredentials ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                <KeyRound size={11} />
                Profil gesichert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Ohne Login
              </span>
            )}
          </div>

          {row.hotel_info && (
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Hotel size={14} className="text-slate-400" />
              {row.hotel_info}
            </p>
          )}

          {row.email ? (
            <p className="inline-flex items-center gap-1.5 break-all text-sm text-slate-600">
              <Mail size={14} className="text-slate-400" />
              <a
                href={`mailto:${row.email}`}
                className="hover:text-sky-700 hover:underline"
              >
                {row.email}
              </a>
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Mail size={13} />
              Noch keine E-Mail hinterlegt
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} />
              Erstellt {formatDateDe(row.created_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={13} />
              Zuletzt gesehen: {formatRelativeDe(row.last_seen_at)}
            </span>
            {row.hasCredentials && (
              <span className="inline-flex items-center gap-1">
                <LogIn size={13} />
                Letzter Login: {formatRelativeDe(row.lastLoginAt)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={13} />
              Letzte Aktivitaet: {formatRelativeDe(row.lastActivity)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-medium text-rose-800 ring-1 ring-rose-100">
              <Sparkles size={12} />
              {row.interestCount} Interessen
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-100">
              <CheckCircle2 size={12} />
              {row.voteIn} dabei
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-100">
              {row.voteMaybe} vielleicht
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200">
              {row.voteOut} raus
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
              {shortId(row.id)}
            </code>
            <button
              type="button"
              onClick={onCopyId}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
              title="Komplette ID kopieren"
            >
              <Copy size={11} />
              {copied ? "Kopiert" : "ID kopieren"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

type ConfirmDeleteModalProps = {
  target: ParticipantRow;
  isBusy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmDeleteModal({
  target,
  isBusy,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teilnehmer loeschen"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => {
          if (!isBusy) onCancel();
        }}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-100 bg-rose-50/60 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-rose-900">
              Teilnehmer wirklich loeschen?
            </h2>
            <p className="mt-1 text-sm text-rose-900/85">
              <strong>{target.display_name}</strong> wird endgueltig
              entfernt. Zugehoerige Interessen und Stimmen werden ebenfalls
              entfernt. Aktivitaeten, die diese Person vorgeschlagen hat,
              bleiben erhalten.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Schliessen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:opacity-50"
            disabled={isBusy}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Endgueltig loeschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

