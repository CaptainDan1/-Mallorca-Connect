"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Sun,
  Wallet,
} from "lucide-react";
import {
  isScheduled,
  type EventProposal,
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
  // Nur freigegebene, aktive Vorschlaege ohne festen Slot.
  // (Vorfilter erfolgt vom Hook bereits via is_active + moderation_status.)
  const open = proposals.filter((p) => !isScheduled(p));
  const sorted = [...open].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title, "de");
  });

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

  function scrollByCards(direction: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-discovery-card]");
    const step = firstCard ? firstCard.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  }

  const isEmpty = sorted.length === 0;

  // Diese Section bricht bewusst aus dem schmalen Hauptcontainer aus.
  // Sie ist als eigene "Buehne" gedacht: voller Breite des Viewports,
  // innen aber durch `max-w-7xl` ruhig begrenzt.
  return (
    <section className="w-full bg-gradient-to-b from-stone-50 via-white to-stone-50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
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

        {isEmpty ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-soft">
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
        ) : (
          <div className="relative">
            {/* Pfeile (Desktop). Mobil ueber Swipe. */}
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              disabled={!canScrollLeft}
              aria-label="Zurueck scrollen"
              className={
                "hidden sm:flex absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-1/2 h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition lg:h-12 lg:w-12 " +
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
                "hidden sm:flex absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2 h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition lg:h-12 lg:w-12 " +
                (canScrollRight
                  ? "opacity-100 hover:bg-slate-50 hover:shadow-xl"
                  : "opacity-0 pointer-events-none")
              }
            >
              <ChevronRight size={22} />
            </button>

            {/* Sanfte Rand-Verlaeufe, damit klar wird: hier scrollt es. */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] hidden w-12 bg-gradient-to-r from-stone-50 to-transparent sm:block" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] hidden w-12 bg-gradient-to-l from-stone-50 to-transparent sm:block" />

            <div
              ref={scrollerRef}
              className="-mx-4 sm:-mx-6 lg:-mx-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
    // Karte selbst ist der klickbare Container. Wir nutzen ein <article>
    // + role="button", damit innen weitere Buttons (Heart) frei nutzbar
    // bleiben und keine Buttons verschachtelt werden.
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

// Kurzfassung des cost_note fuer die Pille im Banner. Wir wollen keine
// langen Saetze auf einem Foto -- nur Spanne oder "kostenlos". Wenn nichts
// erkennbar ist, geben wir null zurueck und lassen die Pille weg.
function summarizeCost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/(kostenlos|gratis|umsonst|free|0\s*€|0\s*eur)/.test(lower)) {
    return "kostenlos";
  }
  // Spanne wie "30-45", "30 – 45", "30 bis 45" mit optionalen Waehrungs-
  // angaben/Punkten.
  const range = text.match(
    /(\d{1,4})(?:\s*(?:[-–—]|bis)\s*)(\d{1,4})\s*(?:€|eur|euro)?/i,
  );
  if (range) {
    return `ca. ${range[1]}–${range[2]} €`;
  }
  // Einzelbetrag wie "ca. 30 €", "30 EUR", "ab 25 €".
  const single = text.match(/(\d{1,4})\s*(?:€|eur|euro)/i);
  if (single) {
    const prefix = /\bab\b/i.test(text)
      ? "ab"
      : /\bca\b\.?/i.test(text)
        ? "ca."
        : "ca.";
    return `${prefix} ${single[1]} €`;
  }
  // Sonst nichts erkannt -- bewusst keine Pille (eher gar nichts als Muell).
  return null;
}
