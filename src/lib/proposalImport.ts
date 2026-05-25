// =====================================================================
// Mallorca-Connect: Import-Parser fuer Aktivitaeten (Admin-Bereich)
// =====================================================================
// Akzeptiert JSON-Eingabe (Array oder einzelnes Objekt), normalisiert
// auf das bestehende Datenmodell und gibt eine Vorschau mit Status pro
// Eintrag zurueck. Standardstatus ist "Entwurf", was in unserem
// Statusmodell so aussieht:
//
//   status            = "proposal"
//   moderation_status = "pending"
//   is_active         = false
//
// Erst der Admin gibt importierte Vorschlaege frei -- es gibt KEINEN
// separaten "draft"-Status.
// =====================================================================

import {
  DISCOVERY_TAGS,
  LOCATION_AREAS,
  emptyProposalInput,
  normalizeDiscoveryTag,
  normalizeLocationArea,
  normalizeTitleSlug,
  normalizeUrlLikeInput,
  type DiscoveryTag,
  type EventProposalInput,
} from "@/lib/proposals";

export type ImportIssueLevel = "error" | "warning";

export type ImportIssue = {
  level: ImportIssueLevel;
  message: string;
};

export type ImportRow = {
  /** 1-basierter Index zur Anzeige in der Vorschau. */
  index: number;
  /** Original-Rohdaten (zu Debug-Zwecken). */
  raw: Record<string, unknown>;
  /** Auf das DB-Schema normalisierter Wert; null bei Fehler. */
  payload: EventProposalInput | null;
  /** "OK" / "Warnung" / "Fehler" – abgeleitet aus issues. */
  status: "ok" | "warning" | "error";
  issues: ImportIssue[];
  /** Slug-aehnliche Form des Titels fuer Dubletten-Vergleich. */
  titleSlug: string;
};

export type ParseImportInput = {
  raw: string;
  existingTitles: string[];
};

export type ParseImportResult =
  | { ok: true; rows: ImportRow[]; rowCount: number }
  | { ok: false; error: string };

/** Pflichtfelder aus dem Importformat. */
const REQUIRED_KEYS = [
  "title",
  "shortDescription",
  "detailDescription",
  "possibleTimes",
  "meetingPoint",
  "costHint",
  "locationArea",
  "category",
] as const;

type RawObject = Record<string, unknown>;

/** Macht aus dem User-Input ein Array (akzeptiert auch ein Einzelobjekt). */
function coerceToArray(value: unknown): RawObject[] | null {
  if (Array.isArray(value)) {
    if (value.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      return value as RawObject[];
    }
    return null;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return [value as RawObject];
  }
  return null;
}

function getString(obj: RawObject, key: string): string | null {
  const v = obj[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Statusmapping aus dem Import auf unser Modell. */
function mapStatus(raw: string | null): {
  status: EventProposalInput["status"];
  moderation_status: EventProposalInput["moderation_status"];
  is_active: boolean;
} {
  const value = raw?.toLowerCase().trim() ?? null;
  // Alles, was nach "fix"/"bestaetigt" aussieht.
  if (value === "confirmed" || value === "fix" || value === "bestaetigt") {
    return {
      status: "confirmed",
      moderation_status: "approved",
      is_active: true,
    };
  }
  // "veroeffentlicht"/"published" -> freigeschaltete Idee, noch nicht fix.
  if (
    value === "published" ||
    value === "approved" ||
    value === "veroeffentlicht"
  ) {
    return {
      status: "proposal",
      moderation_status: "approved",
      is_active: true,
    };
  }
  // Default und alle anderen Werte (insb. "draft" / "entwurf"):
  // unser "Entwurf" = pending + inaktiv.
  return {
    status: "proposal",
    moderation_status: "pending",
    is_active: false,
  };
}

function parseRow(
  raw: RawObject,
  index: number,
  seenSlugs: Set<string>,
  existingSlugs: Set<string>,
): ImportRow {
  const issues: ImportIssue[] = [];

  // Pflichtfelder pruefen.
  const values: Record<(typeof REQUIRED_KEYS)[number], string | null> = {
    title: getString(raw, "title"),
    shortDescription: getString(raw, "shortDescription"),
    detailDescription: getString(raw, "detailDescription"),
    possibleTimes: getString(raw, "possibleTimes"),
    meetingPoint: getString(raw, "meetingPoint"),
    costHint: getString(raw, "costHint"),
    locationArea: getString(raw, "locationArea"),
    category: getString(raw, "category"),
  };

  for (const key of REQUIRED_KEYS) {
    if (!values[key]) {
      issues.push({ level: "error", message: `${labelFor(key)} fehlt` });
    }
  }

  // locationArea: gegen kanonische Liste pruefen / normalisieren.
  let normalizedLocation: string | null = null;
  if (values.locationArea) {
    const normalized = normalizeLocationArea(values.locationArea);
    if (normalized) {
      normalizedLocation = normalized;
    } else {
      issues.push({
        level: "error",
        message: `Ungueltige Lage "${values.locationArea}" (erlaubt: ${LOCATION_AREAS.join(", ")})`,
      });
    }
  }

  // Optionale Felder. URL-aehnliche Eingaben (auch Markdown-Links wie
  // `[Es Trenc](https://...)`) ueber den zentralen Normalizer schicken,
  // damit nie ein relativer Pfad als externe URL gespeichert wird.
  const rawSourceUrl = getString(raw, "sourceUrl");
  const rawImageUrl = getString(raw, "imageUrl");
  const statusInput = getString(raw, "status");

  const sourceUrl = normalizeUrlLikeInput(rawSourceUrl);
  const imageUrl = normalizeUrlLikeInput(rawImageUrl);

  if (rawSourceUrl && !sourceUrl) {
    issues.push({
      level: "warning",
      message: `Quelle sieht nicht wie eine http(s)-URL aus: ${rawSourceUrl}`,
    });
  } else if (!sourceUrl) {
    issues.push({ level: "warning", message: "Quelle fehlt" });
  }

  // Bild ist bewusst optional: fehlende Bilder werden NICHT als Warnung
  // gezaehlt. Nur eine vorhandene aber kaputte Bild-URL ist ein Hinweis.
  // Der UI-Hinweis "Bild kann spaeter ergaenzt werden" laeuft separat
  // ueber den Status `payload.image_path == null` in der Vorschau.
  if (rawImageUrl && !imageUrl) {
    issues.push({
      level: "warning",
      message: `Bild-URL sieht nicht wie eine http(s)-URL aus: ${rawImageUrl}`,
    });
  }

  // tags: Whitelist gegen DISCOVERY_TAGS. Akzeptiert Array oder einzelnen
  // String. Unbekannte Werte produzieren eine Warnung, blockieren aber
  // nichts. Fallback: wenn nichts ueberbleibt, aus `category` ableiten.
  const { tags, unknownTags } = parseTagsInput(raw.tags);
  if (unknownTags.length > 0) {
    issues.push({
      level: "warning",
      message: `Unbekannte Tags ignoriert (${unknownTags.join(", ")}). Erlaubt: ${DISCOVERY_TAGS.join(", ")}`,
    });
  }
  let effectiveTags = tags;
  if (effectiveTags.length === 0) {
    const fallback = values.category
      ? normalizeDiscoveryTag(values.category)
      : null;
    if (fallback) {
      effectiveTags = [fallback];
      issues.push({
        level: "warning",
        message: `Keine Tags angegeben, Fallback aus Kategorie: ${fallback}`,
      });
    }
  }

  // Dubletten.
  const slug = values.title ? normalizeTitleSlug(values.title) : "";
  if (slug) {
    if (existingSlugs.has(slug)) {
      issues.push({
        level: "warning",
        message: "Moegliche Dublette (Titel existiert bereits)",
      });
    } else if (seenSlugs.has(slug)) {
      issues.push({
        level: "warning",
        message: "Doppelter Titel innerhalb dieses Imports",
      });
    }
  }

  const hasError = issues.some((i) => i.level === "error");
  const status: ImportRow["status"] = hasError
    ? "error"
    : issues.length > 0
      ? "warning"
      : "ok";

  let payload: EventProposalInput | null = null;
  if (!hasError) {
    const base = emptyProposalInput();
    const mapped = mapStatus(statusInput);
    payload = {
      ...base,
      title: values.title as string,
      short_description: values.shortDescription,
      long_description: values.detailDescription,
      duration: values.possibleTimes,
      meeting_point: values.meetingPoint,
      cost_note: values.costHint,
      image_path: imageUrl,
      location_area: normalizedLocation,
      category: values.category,
      source_url: sourceUrl,
      tags: effectiveTags,
      status: mapped.status,
      moderation_status: mapped.moderation_status,
      is_active: mapped.is_active,
    };
  }

  return {
    index,
    raw,
    payload,
    status,
    issues,
    titleSlug: slug,
  };
}

// Akzeptiert Array, einzelnen String, kommagetrennten String oder undefined.
// Liefert kanonische Tags + Liste der unerkannten Eingaben (fuer Warnung).
function parseTagsInput(input: unknown): {
  tags: DiscoveryTag[];
  unknownTags: string[];
} {
  const raw: unknown[] = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];
  const seen = new Set<DiscoveryTag>();
  const tags: DiscoveryTag[] = [];
  const unknownTags: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const normalized = normalizeDiscoveryTag(trimmed);
    if (normalized) {
      if (!seen.has(normalized)) {
        seen.add(normalized);
        tags.push(normalized);
      }
    } else {
      unknownTags.push(trimmed);
    }
  }
  return { tags, unknownTags };
}

function labelFor(key: (typeof REQUIRED_KEYS)[number]): string {
  switch (key) {
    case "title":
      return "Titel";
    case "shortDescription":
      return "Kurzbeschreibung";
    case "detailDescription":
      return "Detailbeschreibung";
    case "possibleTimes":
      return "Zeiten";
    case "meetingPoint":
      return "Treffpunkt";
    case "costHint":
      return "Kosten";
    case "locationArea":
      return "Lage";
    case "category":
      return "Kategorie";
  }
}

export function parseImportInput({
  raw,
  existingTitles,
}: ParseImportInput): ParseImportResult {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, error: "Kein Inhalt – bitte JSON einfuegen." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "JSON konnte nicht gelesen werden.";
    return {
      ok: false,
      error: `JSON ungueltig: ${message}`,
    };
  }

  const arr = coerceToArray(parsed);
  if (!arr) {
    return {
      ok: false,
      error:
        "Erwartet wird ein Array von Aktivitaeten oder ein einzelnes Objekt.",
    };
  }
  if (arr.length === 0) {
    return { ok: false, error: "Das Array ist leer – nichts zu importieren." };
  }

  const existingSlugs = new Set(
    existingTitles
      .map((t) => normalizeTitleSlug(t))
      .filter((s) => s.length > 0),
  );
  const seenSlugs = new Set<string>();
  const rows: ImportRow[] = [];
  for (let i = 0; i < arr.length; i += 1) {
    const row = parseRow(arr[i], i + 1, seenSlugs, existingSlugs);
    if (row.titleSlug) seenSlugs.add(row.titleSlug);
    rows.push(row);
  }
  return { ok: true, rows, rowCount: rows.length };
}

// Beispiel-JSON fuer den "Beispiel anzeigen"-Button.
export const IMPORT_EXAMPLE_JSON = `[
  {
    "title": "Es Trenc Beach Day",
    "shortDescription": "Karibik-Feeling im Sueden: weisser Sand, tuerkises Wasser, entspanntes Ankommen.",
    "detailDescription": "Lockerer Strandtag ohne Programmstress. Jeder bringt Handtuch, Wasser und Sonnenschutz mit. Wer Lust hat, bleibt nur 2 Stunden, andere koennen laenger chillen, baden oder Richtung Ses Covetes spazieren.",
    "possibleTimes": "Flexibel, ideal 10:00-14:00 Uhr oder 16:00 Uhr bis Sonnenuntergang.",
    "meetingPoint": "Strandzugang / Parkplatz Es Trenc, Ses Covetes, 07639 Campos",
    "costHint": "Strand kostenlos; Parken, Liegen, Snacks ca. 10-35 EUR p. P.",
    "locationArea": "Sued",
    "category": "Chillen",
    "sourceUrl": "https://www.mallorqa.com/de/beaches/es-trenc",
    "imageUrl": "",
    "tags": ["Wasser", "Entspannung", "Natur"],
    "status": "draft"
  }
]
`;
