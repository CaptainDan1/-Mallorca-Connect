"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  ImageOff,
  Loader2,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  EVENT_PROPOSALS_TABLE,
  LOCATION_AREA_BADGE,
  PROPOSAL_MODERATION_BADGE,
  PROPOSAL_MODERATION_LABELS,
  type EventProposal,
} from "@/lib/proposals";
import {
  EVENT_IMAGE_ALLOWED_MIME_TYPES,
  uploadEventImage,
  validateEventImageFile,
} from "@/lib/storage";

type ImageFilter = "all" | "without" | "with";
type StatusFilter = "all" | "active" | "inactive" | "pending";

type RowState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "success" }
  | { phase: "error"; message: string };

const ACCEPT_ATTR = EVENT_IMAGE_ALLOWED_MIME_TYPES.join(",");

export default function AdminImagesPage() {
  const configured = isSupabaseConfigured();

  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [imageFilter, setImageFilter] = useState<ImageFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Upload-Status pro Proposal-ID. Bewusst lokal -- Liste nicht neu laden,
  // damit Suche/Filter erhalten bleiben.
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

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
      const { data, error } = await supabase
        .from(EVENT_PROPOSALS_TABLE)
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      setProposals((data as EventProposal[]) ?? []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Aktivitaeten konnten nicht geladen werden.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    let withImage = 0;
    let withoutImage = 0;
    for (const p of proposals) {
      if (p.image_path) withImage += 1;
      else withoutImage += 1;
    }
    return {
      total: proposals.length,
      withImage,
      withoutImage,
    };
  }, [proposals]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return proposals.filter((p) => {
      if (term && !p.title.toLowerCase().includes(term)) return false;
      if (imageFilter === "with" && !p.image_path) return false;
      if (imageFilter === "without" && p.image_path) return false;
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      if (statusFilter === "pending" && p.moderation_status !== "pending")
        return false;
      return true;
    });
  }, [proposals, search, imageFilter, statusFilter]);

  // Upload-Helper: validiert, laedt hoch (bestehender uploadEventImage),
  // schreibt nur `image_path` in der DB. Andere Felder bleiben unangetastet.
  const handleUpload = useCallback(
    async (proposalId: string, file: File) => {
      if (!configured) return;
      const validation = validateEventImageFile(file);
      if (validation) {
        setRowStates((prev) => ({
          ...prev,
          [proposalId]: { phase: "error", message: validation },
        }));
        return;
      }
      setRowStates((prev) => ({
        ...prev,
        [proposalId]: { phase: "uploading" },
      }));
      try {
        const { publicUrl } = await uploadEventImage(proposalId, file);
        const supabase = getSupabaseClient();
        // WICHTIG: nur image_path aktualisieren. Wir senden bewusst kein
        // weiteres Feld mit, damit kein anderes Attribut versehentlich
        // ueberschrieben wird (insbesondere keine RLS-relevanten Felder).
        const { data, error } = await supabase
          .from(EVENT_PROPOSALS_TABLE)
          .update({ image_path: publicUrl })
          .eq("id", proposalId)
          .select("*")
          .single();
        if (error) throw error;
        const updated = data as EventProposal;
        setProposals((prev) =>
          prev.map((p) => (p.id === proposalId ? updated : p)),
        );
        setRowStates((prev) => ({
          ...prev,
          [proposalId]: { phase: "success" },
        }));
        // Erfolgsmeldung dezent fade out nach 2.5s.
        window.setTimeout(() => {
          setRowStates((prev) => {
            const current = prev[proposalId];
            if (current?.phase !== "success") return prev;
            const next = { ...prev };
            delete next[proposalId];
            return next;
          });
        }, 2500);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Upload hat nicht geklappt.";
        setRowStates((prev) => ({
          ...prev,
          [proposalId]: { phase: "error", message },
        }));
      }
    },
    [configured],
  );

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-24 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Zurueck zur Uebersicht
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Bilder verwalten
          </h1>
          <p className="text-sm text-slate-600">
            Bilder pro Aktivitaet schnell nachpflegen. Ziehe ein Foto direkt
            auf die Zeile oder waehle es ueber den Button.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
              {counts.total} Aktivitaet{counts.total === 1 ? "" : "en"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-100">
              <ImageIcon size={12} />
              {counts.withImage} mit Bild
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-100">
              <ImageOff size={12} />
              {counts.withoutImage} ohne Bild
            </span>
          </div>
        </header>

        <section className="space-y-3 rounded-3xl border border-white bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titel suchen..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 pl-9 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <FilterPills
                label="Bild"
                value={imageFilter}
                onChange={(v) => setImageFilter(v as ImageFilter)}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "without", label: "Ohne Bild" },
                  { value: "with", label: "Mit Bild" },
                ]}
              />
              <FilterPills
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "active", label: "Aktiv" },
                  { value: "pending", label: "Wartet auf Freigabe" },
                  { value: "inactive", label: "Inaktiv" },
                ]}
              />
            </div>
          </div>
        </section>

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-3xl bg-white px-5 py-6 text-sm text-slate-600 shadow-soft">
            <Loader2 size={16} className="animate-spin" />
            Lade Aktivitaeten...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-base font-medium text-slate-700">
              Keine Aktivitaeten in dieser Ansicht.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Suche oder Filter anpassen.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((proposal) => (
              <ImageRow
                key={proposal.id}
                proposal={proposal}
                state={rowStates[proposal.id] ?? { phase: "idle" }}
                onUpload={handleUpload}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

type FilterPillsProps<T extends string> = {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
};

function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options,
}: FilterPillsProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-slate-500 sm:inline">
        {label}
      </span>
      <div
        role="tablist"
        aria-label={label}
        className="flex items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-stone-50/70 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition " +
                (active
                  ? "bg-slate-900 text-white shadow-soft"
                  : "text-slate-600 hover:bg-white")
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ImageRowProps = {
  proposal: EventProposal;
  state: RowState;
  onUpload: (proposalId: string, file: File) => void;
};

function ImageRow({ proposal, state, onUpload }: ImageRowProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // dragDepth verhindert Flackern beim drag-Wechsel ueber Kind-Elemente.
  const dragDepth = useRef(0);

  const hasImage = Boolean(proposal.image_path);
  const isUploading = state.phase === "uploading";

  function openPicker() {
    if (isUploading) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onUpload(proposal.id, file);
  }

  function handleDragEnter(event: React.DragEvent<HTMLLIElement>) {
    if (isUploading) return;
    if (!event.dataTransfer?.types?.includes("Files")) return;
    dragDepth.current += 1;
    setIsDragOver(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLLIElement>) {
    if (isUploading) return;
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent<HTMLLIElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragOver(false);
    if (isUploading) return;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    onUpload(proposal.id, file);
  }

  const moderation = proposal.moderation_status;
  const moderationLabel = PROPOSAL_MODERATION_LABELS[moderation];
  const moderationClass = PROPOSAL_MODERATION_BADGE[moderation];
  const locationClass = proposal.location_area
    ? (LOCATION_AREA_BADGE[proposal.location_area] ??
      "bg-slate-50 text-slate-700 ring-slate-200")
    : null;

  const dragClass = isDragOver
    ? "border-amber-300 bg-amber-50/60 ring-2 ring-amber-200"
    : "border-white bg-white hover:bg-stone-50";

  return (
    <li
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={
        "flex flex-col gap-3 rounded-2xl border p-3 shadow-soft transition sm:flex-row sm:items-center " +
        dragClass
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={isUploading}
        title="Bild tauschen"
        className={
          "relative h-20 w-32 shrink-0 overflow-hidden rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 " +
          (hasImage
            ? "bg-stone-100"
            : "border-2 border-dashed border-slate-200 bg-stone-50/80 hover:border-amber-300 hover:bg-amber-50/40")
        }
      >
        <div className="aspect-[16/9] w-full">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proposal.image_path as string}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-slate-400">
              <ImageOff size={16} />
              <span className="text-[9px] font-medium uppercase tracking-wide">
                Ohne Bild
              </span>
            </div>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {proposal.title}
          </h3>
          {!proposal.is_active && (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              Inaktiv
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${moderationClass}`}
          >
            {moderationLabel}
          </span>
          {proposal.location_area && locationClass && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${locationClass}`}
            >
              {proposal.location_area}
            </span>
          )}
          {proposal.category && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              {proposal.category}
            </span>
          )}
        </div>
        {state.phase === "error" && (
          <p
            role="alert"
            className="inline-flex items-start gap-1 text-[11px] text-rose-700"
          >
            <XCircle size={12} className="mt-0.5 shrink-0" />
            {state.message}
          </p>
        )}
        {state.phase === "success" && (
          <p className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <CheckCircle2 size={12} />
            Bild aktualisiert.
          </p>
        )}
        {state.phase === "idle" && !hasImage && (
          <p className="text-[11px] text-slate-500">
            <span className="hidden sm:inline">
              Bild hier ablegen oder ueber den Button auswaehlen.
            </span>
            <span className="sm:hidden">
              Tippe rechts auf &bdquo;Bild tauschen&ldquo;.
            </span>
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={openPicker}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          {isUploading
            ? "Lade hoch..."
            : hasImage
              ? "Bild tauschen"
              : "Bild hochladen"}
        </button>
      </div>
    </li>
  );
}
