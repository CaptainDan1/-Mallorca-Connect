import { Bike, Sailboat, Waves, Music, Bike as Scooter } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ActivityKey =
  | "ebike_tour"
  | "roller_tour"
  | "schnorcheln"
  | "bootsausflug"
  | "megapark";

export type ActivityDefinition = {
  key: ActivityKey;
  title: string;
  subtitle: string;
  pillLabel: string;
  icon: LucideIcon;
  hint?: string;
  accent: string; // tailwind gradient classes for icon bubble
};

export const ACTIVITIES: ActivityDefinition[] = [
  {
    key: "ebike_tour",
    title: "E-Bike-Tour",
    subtitle: "Entspannt die Kueste entlang rollen.",
    pillLabel: "E-Bike",
    icon: Bike,
    accent: "from-emerald-400 to-teal-500",
  },
  {
    key: "roller_tour",
    title: "Roller-Tour",
    subtitle: "Inseltour mit 125er-Rollern.",
    pillLabel: "Roller",
    icon: Scooter,
    hint: "125er-Roller: Fuehrerschein Klasse B muss in Spanien in der Regel seit mindestens 3 Jahren bestehen.",
    accent: "from-amber-400 to-orange-500",
  },
  {
    key: "schnorcheln",
    title: "Schnorcheln",
    subtitle: "Bunte Bucht, klares Wasser.",
    pillLabel: "Schnorcheln",
    icon: Waves,
    accent: "from-sky-400 to-cyan-500",
  },
  {
    key: "bootsausflug",
    title: "Bootsausflug",
    subtitle: "Halber Tag auf dem Mittelmeer.",
    pillLabel: "Boot",
    icon: Sailboat,
    accent: "from-sky-500 to-teal-500",
  },
  {
    key: "megapark",
    title: "Abend im Megapark",
    subtitle: "Gemeinsam tanzen, lachen, schunkeln.",
    pillLabel: "Megapark",
    icon: Music,
    accent: "from-fuchsia-500 to-pink-500",
  },
];

export const ACTIVITY_BY_KEY: Record<ActivityKey, ActivityDefinition> =
  ACTIVITIES.reduce(
    (acc, item) => {
      acc[item.key] = item;
      return acc;
    },
    {} as Record<ActivityKey, ActivityDefinition>,
  );
