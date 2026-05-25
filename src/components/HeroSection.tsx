import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1559564454-0bad35676ee7?auto=format&fit=crop&w=1200&q=80";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[68vh] min-h-[440px] w-full">
        <Image
          src={HERO_IMAGE}
          alt="Bucht auf Mallorca mit tuerkisem Meer"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-3xl px-5 pb-10 sm:pb-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur ring-1 ring-white/25">
              <CalendarDays size={14} />
              13.06. &ndash; 17.06.
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white drop-shadow-sm">
              Mallorca-Connect
            </h1>
            <p className="mt-3 max-w-xl text-base sm:text-lg text-white/90">
              Unser kleiner Treffpunkt fuer spontane Aktionen vor Ort.
              <br className="hidden sm:block" />
              Alles kann, nichts muss.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm text-white/85">
              <MapPin size={16} />
              <span>Mallorca, Balearen</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
