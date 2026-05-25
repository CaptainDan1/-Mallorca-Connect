"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Sun,
  Wallet,
} from "lucide-react";
import {
  DISCOVERY_TAGS,
  LOCATION_AREAS,
  LOCATION_AREA_BADGE,
  isScheduled,
  type DiscoveryTag,
  type EventProposal,
  type LocationArea,
} from "@/lib/proposals";

type ActivityDiscoveryProps = {
  proposals: EventProposal[];
  interestCounts: Map<string, number>;
  isInterested: (proposalId: string) => boolean;
  interestBusyFor: string | null;
  onToggleInterest: (proposalId: string) => void;
  onOpenProposal: (proposalId: string) => void;
  onSuggest: () => void;
  canInteract: boolean;
};

export function ActivityDiscovery({
  proposals,
  interestCounts,
  isInterested,
  interestBusyFor,
  onToggleInterest,
  onOpenProposal,
  onSuggest,
  canInteract,
}: ActivityDiscoveryProps) {
  // Aktiver Tag-Filter ("Was?"). `null` = "Alles". Wird nur clientseitig
  // gehalten, keine URL- oder Local-Storage-Bindung.
  const [activeTag, setActiveTag] = useState<DiscoveryTag | null>(null);
  // Aktiver Region-Filter ("Wo?"). `null` = "Ganze Insel". `Ganze Insel` ist
  // bewusst kein gespeicherter location_area-Wert, sondern nur die UI-Form
  // fuer "kein Regionsfilter".
  const [activeArea, setActiveArea] = useState<LocationArea | null>(null);

  // Nur freigegebene, aktive Vorschlaege ohne festen Slot.
  const open = useMemo(
    () => proposals.filter((p) => !isScheduled(p)),
    [proposals],
  );

  // Counts pro Tag fuer die Was-Leiste. Wir respektieren bereits den
  // aktiven Wo-Filter, damit die Zahlen nicht luegen.
  const tagCounts = useMemo(() => {
    const counts: Record<DiscoveryTag, number> = {
      Aktion: 0,
      Entspannung: 0,
      Wasser: 0,
      Kultur: 0,
      Essen: 0,
      Natur: 0,
      Party: 0,
    };
    for (const p of open) {
      if (activeArea && p.location_area !== activeArea) continue;
      const tags = p.tags ?? [];
      for (const tag of tags) {
        if (tag in counts) counts[tag as DiscoveryTag] += 1;
      }
    }
    return counts;
  }, [open, activeArea]);

  // Counts pro Region fuer die Wo-Leiste -- respektiert den aktiven
  // Was-Filter, damit die Zahlen sich gegenseitig erklaeren.
  const areaCounts = useMemo(() => {
    const counts = {} as Record<LocationArea, number>;
    for (const area of LOCATION_AREAS) counts[area] = 0;
    for (const p of open) {
      if (activeTag && !(p.tags ?? []).includes(activeTag)) continue;
      const area = p.location_area as LocationArea | null;
      if (area && area in counts) counts[area] += 1;
    }
    return counts;
  }, [open, activeTag]);

  // Gesamtsummen fuer "Alles" / "Ganze Insel" -- jeweils unter
  // Beruecksichtigung des anderen Filters.
  const totalForCurrentArea = useMemo(() => {
    if (!activeArea) return open.length;
    return open.filter((p) => p.location_area === activeArea).length;
  }, [open, activeArea]);

  const totalForCurrentTag = useMemo(() => {
    if (!activeTag) return open.length;
    return open.filter((p) => (p.tags ?? []).includes(activeTag)).length;
  }, [open, activeTag]);

  const filtered = useMemo(() => {
    return open.filter((p) => {
      if (activeTag && !(p.tags ?? []).includes(activeTag)) return false;
      if (activeArea && p.location_area !== activeArea) return false;
      return true;
    });
  }, [open, activeTag, activeArea]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.title.localeCompare(b.title, "de");
      }),
    [filtered],
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, sorted.length]);

  // Wenn ein Filter wechselt, zurueck nach links scrollen -- so sieht der
  // Nutzer sofort, was die neue Auswahl bringt.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeTag, activeArea]);

  function scrollByCards(direction: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-discovery-card]");
    const step = firstCard ? firstCard.offsetWidth + 20 : el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  }

  function handleTagClick(tag: DiscoveryTag) {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }

  function handleAreaClick(area: LocationArea) {
    setActiveArea((prev) => (prev === area ? null : area));
  }

  const isEmptyOverall = open.length === 0;
  const isEmptyFiltered = sorted.length === 0;

  return (
    <section className="w-full bg-gradient-to-b from-stone-50 via-white to-stone-50">
      {/* Header + Filter bleiben im normalen Content-Container. */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <header className="mb-4 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              Inspiration
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Aktivitaeten entdecken
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Ideen, die noch nicht fest eingeplant sind. Zeig Interesse,
              damit der Admin weiss, was die Crew anlocken wuerde.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onSuggest}
              disabled={!canInteract}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageSquarePlus size={16} />
              Eigene Idee vorschlagen
            </button>
          </div>
        </header>

        {/* Zwei Chip-Zeilen: "Was?" (Tag) und "Wo?" (Region). Mobile:
            horizontal scrollbar. Desktop: nebeneinander mit kleinem Label. */}
        {!isEmptyOverall && (
          <div className="space-y-2">
            <TagFilterBar
              activeTag={activeTag}
              tagCounts={tagCounts}
              totalCount={totalForCurrentArea}
              onSelectAll={() => setActiveTag(null)}
              onSelectTag={handleTagClick}
            />
            <AreaFilterBar
              activeArea={activeArea}
              areaCounts={areaCounts}
              totalCount={totalForCurrentTag}
              onSelectAll={() => setActiveArea(null)}
              onSelectArea={handleAreaClick}
            />
          </div>
        )}
      </div>

      {/* Carousel bricht aus dem max-w-7xl aus und nutzt eine groessere
          Buehne. Fades + Pfeile sitzen jetzt an der Aussenkante der
          Buehne -- nicht mitten ueber den Karten. */}
      <div className="mx-auto mt-4 w-full max-w-[1600px] pb-8 sm:mt-5 sm:pb-10">
        {isEmptyOverall ? (
          <div className="mx-4 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-soft sm:mx-6 lg:mx-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft">
              <Sparkles size={20} />
            </div>
            <p className="text-base font-medium text-slate-700">
              Noch keine offenen Ideen.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Mach den ersten Vorschlag fuer die Crew.
            </p>
          </div>
        ) : isEmptyFiltered ? (
          <div className="mx-4 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-soft sm:mx-6 lg:mx-8">
            <p className="text-base font-medium text-slate-700">
              Nichts gefunden{activeTag ? ` unter "${activeTag}"` : ""}
              {activeArea ? ` in ${activeArea}` : ""}.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Wechsel die Filter oder schau spaeter wieder vorbei.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTag(null);
                setActiveArea(null);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50"
            >
              Filter zuruecksetzen
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Pfeile sitzen jetzt am Rand der Buehne (max-w-[1600px]).
                Auf Mobile per Swipe. */}
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              disabled={!canScrollLeft}
              aria-label="Zurueck scrollen"
              className={
                "absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition sm:flex lg:left-4 lg:h-12 lg:w-12 " +
                (canScrollLeft
                  ? "opacity-100 hover:bg-slate-50 hover:shadow-xl"
                  : "opacity-0 pointer-events-none")
              }
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards("right")}
              disabled={!canScrollRight}
              aria-label="Weiter scrollen"
              className={
                "absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition sm:flex lg:right-4 lg:h-12 lg:w-12 " +
                (canScrollRight
                  ? "opacity-100 hover:bg-slate-50 hover:shadow-xl"
                  : "opacity-0 pointer-events-none")
              }
            >
              <ChevronRight size={22} />
            </button>

            {/* Fade-Masken sitzen am Aussenrand der Buehne, nicht im
                Content-Container. Auf Mobile (< sm) bewusst aus, damit
                Touch-Scroll nicht von einem Overlay verdeckt wird. */}
            <div
              aria-hidden
              className={
                "pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-stone-50 via-stone-50/80 to-transparent sm:block " +
                (canScrollLeft ? "opacity-100" : "opacity-0")
              }
            />
            <div
              aria-hidden
              className={
                "pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-stone-50 via-stone-50/80 to-transparent sm:block " +
                (canScrollRight ? "opacity-100" : "opacity-0")
              }
            />

            <div
              ref={scrollerRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:px-8 lg:px-16 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {sorted.map((proposal) => {
                const count = interestCounts.get(proposal.id) ?? 0;
                const mine = isInterested(proposal.id);
                const busy = interestBusyFor === proposal.id;
                return (
                  <DiscoveryCard
                    key={proposal.id}
                    proposal={proposal}
                    count={count}
                    mine={mine}
                    busy={busy}
                    disabled={!canInteract}
                    onToggleInterest={() => onToggleInterest(proposal.id)}
                    onOpen={() => onOpenProposal(proposal.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type TagFilterBarProps = {
  activeTag: DiscoveryTag | null;
  tagCounts: Record<DiscoveryTag, number>;
  totalCount: number;
  onSelectAll: () => void;
  onSelectTag: (tag: DiscoveryTag) => void;
};

const FILTER_PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

const FILTER_LABEL =
  "hidden w-14 shrink-0 items-center gap-1 pr-1 text-xs font-medium uppercase tracking-wide text-slate-500 sm:inline-flex";

const FILTER_COUNT_ACTIVE = "bg-white/20 text-white";
const FILTER_COUNT_IDLE = "bg-slate-100 text-slate-600";

function FilterCountBadge({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  return (
    <span
      className={
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold " +
        (active ? FILTER_COUNT_ACTIVE : FILTER_COUNT_IDLE)
      }
    >
      {count}
    </span>
  );
}

function TagFilterBar({
  activeTag,
  tagCounts,
  totalCount,
  onSelectAll,
  onSelectTag,
}: TagFilterBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Aktivitaeten nach Typ filtern"
      className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <span className={FILTER_LABEL}>
        <Filter size={12} />
        Was?
      </span>
      <button
        type="button"
        role="tab"
        aria-selected={activeTag === null}
        onClick={onSelectAll}
        className={
          FILTER_PILL +
          (activeTag === null
            ? " bg-slate-900 text-white ring-slate-900 shadow-soft"
            : " bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
        }
      >
        Alles
        <FilterCountBadge count={totalCount} active={activeTag === null} />
      </button>
      {DISCOVERY_TAGS.map((tag) => {
        const active = activeTag === tag;
        const count = tagCounts[tag];
        return (
          <button
            key={tag}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectTag(tag)}
            className={
              FILTER_PILL +
              (active
                ? " bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-orange-400 shadow-soft"
                : " bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
            }
          >
            {tag}
            <FilterCountBadge count={count} active={active} />
          </button>
        );
      })}
    </div>
  );
}

type AreaFilterBarProps = {
  activeArea: LocationArea | null;
  areaCounts: Record<LocationArea, number>;
  totalCount: number;
  onSelectAll: () => void;
  onSelectArea: (area: LocationArea) => void;
};

function AreaFilterBar({
  activeArea,
  areaCounts,
  totalCount,
  onSelectAll,
  onSelectArea,
}: AreaFilterBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Aktivitaeten nach Region filtern"
      className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <span className={FILTER_LABEL}>
        <Filter size={12} />
        Wo?
      </span>
      <button
        type="button"
        role="tab"
        aria-selected={activeArea === null}
        onClick={onSelectAll}
        className={
          FILTER_PILL +
          (activeArea === null
            ? " bg-slate-900 text-white ring-slate-900 shadow-soft"
            : " bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
        }
      >
        Ganze Insel
        <FilterCountBadge count={totalCount} active={activeArea === null} />
      </button>
      {LOCATION_AREAS.map((area) => {
        const active = activeArea === area;
        const count = areaCounts[area];
        // Aktive Pille nutzt die kanonische Regions-Farbe (laesst sich
        // visuell vom orangen Was-Filter unterscheiden).
        const activeTone =
          " ring-sky-300 shadow-soft " +
          (LOCATION_AREA_BADGE[area] ?? "bg-sky-50 text-sky-800 ring-sky-100");
        return (
          <button
            key={area}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectArea(area)}
            className={
              FILTER_PILL +
              (active
                ? activeTone
                : " bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
            }
          >
            {area}
            <FilterCountBadge count={count} active={false} />
          </button>
        );
      })}
    </div>
  );
}

type DiscoveryCardProps = {
  proposal: EventProposal;
  count: number;
  mine: boolean;
  busy: boolean;
  disabled: boolean;
  onToggleInterest: () => void;
  onOpen: () => void;
};

function DiscoveryCard({
  proposal,
  count,
  mine,
  busy,
  disabled,
  onToggleInterest,
  onOpen,
}: DiscoveryCardProps) {
  const hasImage = Boolean(proposal.image_path);
  const costSummary = summarizeCost(proposal.cost_note);

  function handleInterestClick(event: React.MouseEvent<HTMLButtonElement>) {
    // Karte ist als Ganzes klickbar. Der Heart-Button darf den Klick auf
    // die Karte (oeffnet das Detailfenster) nicht ausloesen.
    event.stopPropagation();
    onToggleInterest();
  }

  return (
    <article
      data-discovery-card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Details zu ${proposal.title} oeffnen`}
      className="group relative flex w-[82%] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-3xl border border-white bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:w-[58%] md:w-[42%] lg:w-[32%] xl:w-[28%]"
    >
      <div className="relative block aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-200 via-orange-200 to-sky-200">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proposal.image_path as string}
            alt=""
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/90">
            <Sparkles size={56} className="drop-shadow" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/55 via-slate-900/15 to-transparent" />
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur">
            Noch nicht eingeplant
          </span>
        </div>
        {proposal.location_area && (
          // Region nur Orientierung, bewusst dezenter als Status/Preis:
          // kein eigener Ring, kleineres Padding, leichter transparent.
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
            <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">
              {proposal.location_area}
            </span>
          </div>
        )}
        {costSummary && (
          <div className="absolute right-3 top-3">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-soft ring-1 ring-black/5 backdrop-blur"
              title={proposal.cost_note ?? undefined}
            >
              <Wallet size={12} aria-hidden />
              {costSummary}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-semibold leading-tight text-white drop-shadow">
            {proposal.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {proposal.short_description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {proposal.short_description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-100">
            <Sun size={12} />
            {count} interessiert
          </span>
          {mine && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-100">
              Du bist dabei interessiert
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleInterestClick}
            disabled={disabled || busy}
            aria-pressed={mine}
            aria-label={
              mine
                ? `Interesse an ${proposal.title} entfernen`
                : `Interesse an ${proposal.title} merken`
            }
            className={
              "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 " +
              (mine
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-soft hover:from-rose-500 hover:to-pink-600"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")
            }
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Heart
                size={14}
                className={mine ? "fill-current" : ""}
                aria-hidden
              />
            )}
            {mine ? "Interesse gemerkt" : "Interessiert"}
          </button>
        </div>
      </div>
    </article>
  );
}

function summarizeCost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/(kostenlos|gratis|umsonst|free|0\s*€|0\s*eur)/.test(lower)) {
    return "kostenlos";
  }
  const range = text.match(
    /(\d{1,4})(?:\s*(?:[-–—]|bis)\s*)(\d{1,4})\s*(?:€|eur|euro)?/i,
  );
  if (range) {
    return `ca. ${range[1]}–${range[2]} €`;
  }
  const single = text.match(/(\d{1,4})\s*(?:€|eur|euro)/i);
  if (single) {
    const prefix = /\bab\b/i.test(text)
      ? "ab"
      : /\bca\b\.?/i.test(text)
        ? "ca."
        : "ca.";
    return `${prefix} ${single[1]} €`;
  }
  return null;
}
