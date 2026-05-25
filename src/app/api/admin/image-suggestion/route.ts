import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { normalizeUrlLikeInput, resolveImageUrl } from "@/lib/proposals";

// Holt eine Webseite, liest og:image / twitter:image / JSON-LD `image`
// und liefert eine absolute http(s)-Bild-URL als Vorschlag. Es wird nichts
// heruntergeladen oder gespeichert -- der Admin entscheidet in der Vorschau,
// ob er die URL uebernimmt. Bildrechte / Hotlinking liegen damit beim
// Admin.
//
// Wichtig:
//  * niemals einen App-Crash verursachen
//  * Timeout 8s, damit ein langsamer Server den Import nicht blockiert
//  * Bei Fehlern -> 200 mit { ok: false, reason } zurueck, damit das
//    Frontend die Warnung anzeigen kann statt eines Fehlers
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 1024 * 1024; // 1 MB HTML reicht voellig fuer die Meta-Tags

type SuggestionResponse =
  | {
      ok: true;
      imageUrl: string;
      source: "og" | "twitter" | "jsonld";
      finalUrl: string;
    }
  | {
      ok: false;
      reason: string;
    };

function unauthorized() {
  return NextResponse.json(
    { ok: false, reason: "Nicht eingeloggt." } as SuggestionResponse,
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  // Admin-Cookie pruefen -- die Route liegt unter /api/admin und ist
  // bewusst nur fuer den Adminbereich gedacht.
  if (request.cookies.get(ADMIN_COOKIE)?.value !== "true") {
    return unauthorized();
  }

  const rawUrl = request.nextUrl.searchParams.get("url");
  const normalized = normalizeUrlLikeInput(rawUrl);
  if (!normalized) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Keine gueltige http(s)-URL.",
      } as SuggestionResponse,
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(normalized, {
      method: "GET",
      headers: {
        // Hoeflicher User-Agent, damit Seiten uns nicht blocken.
        "User-Agent":
          "Mozilla/5.0 (compatible; MallorcaConnectImagePreview/1.0)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        reason: `HTTP ${response.status} beim Abruf der Quelle.`,
      } as SuggestionResponse);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("html")) {
      return NextResponse.json({
        ok: false,
        reason: `Quelle liefert kein HTML (Content-Type: ${contentType || "unbekannt"}).`,
      } as SuggestionResponse);
    }

    const html = await readLimited(response, MAX_BYTES);
    const finalUrl = response.url || normalized;
    const found = extractImageCandidate(html, finalUrl);

    if (!found) {
      return NextResponse.json({
        ok: false,
        reason:
          "Kein og:image / twitter:image / JSON-LD-Bild gefunden.",
      } as SuggestionResponse);
    }

    return NextResponse.json({
      ok: true,
      imageUrl: found.imageUrl,
      source: found.source,
      finalUrl,
    } as SuggestionResponse);
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "Quelle hat zu lange gebraucht (Timeout)."
        : error instanceof Error
          ? error.message
          : "Quelle konnte nicht abgerufen werden.";
    return NextResponse.json({ ok: false, reason } as SuggestionResponse);
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  // Streamt bis maxBytes erreicht ist, bricht dann ab. Verhindert, dass
  // riesige Seiten den Server-Worker blockieren.
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let html = "";
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (received >= maxBytes) break;
    }
    html += decoder.decode();
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignorieren
    }
  }
  return html;
}

type Candidate = {
  imageUrl: string;
  source: "og" | "twitter" | "jsonld";
};

function extractImageCandidate(html: string, baseUrl: string): Candidate | null {
  // Bevorzugte Reihenfolge: og:image > twitter:image > JSON-LD.
  const og =
    matchMeta(html, "property", "og:image:secure_url") ||
    matchMeta(html, "property", "og:image:url") ||
    matchMeta(html, "property", "og:image") ||
    matchMeta(html, "name", "og:image");
  const ogResolved = og ? resolveImageUrl(og, baseUrl) : null;
  if (ogResolved) {
    return { imageUrl: ogResolved, source: "og" };
  }

  const twitter =
    matchMeta(html, "name", "twitter:image") ||
    matchMeta(html, "name", "twitter:image:src") ||
    matchMeta(html, "property", "twitter:image");
  const twitterResolved = twitter ? resolveImageUrl(twitter, baseUrl) : null;
  if (twitterResolved) {
    return { imageUrl: twitterResolved, source: "twitter" };
  }

  const jsonLd = extractJsonLdImage(html);
  const jsonLdResolved = jsonLd ? resolveImageUrl(jsonLd, baseUrl) : null;
  if (jsonLdResolved) {
    return { imageUrl: jsonLdResolved, source: "jsonld" };
  }

  return null;
}

// Findet `<meta <attr>="<key>" content="...">` (auch in umgekehrter Reihenfolge).
function matchMeta(
  html: string,
  attr: "name" | "property",
  key: string,
): string | null {
  const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]*\\b${attr}\\s*=\\s*["']${safeKey}["'][^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*\\b${attr}\\s*=\\s*["']${safeKey}["'][^>]*>`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      return decodeHtmlEntities(m[1].trim());
    }
  }
  return null;
}

function extractJsonLdImage(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const found = findImageInJsonLd(parsed);
    if (found) return found;
  }
  return null;
}

function findImageInJsonLd(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "string") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findImageInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const image = obj.image;
  if (typeof image === "string" && image.trim()) {
    return image.trim();
  }
  if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const url = (item as Record<string, unknown>).url;
        if (typeof url === "string" && url.trim()) return url.trim();
      }
    }
  }
  if (image && typeof image === "object") {
    const url = (image as Record<string, unknown>).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  // Tiefer schauen.
  for (const key of Object.keys(obj)) {
    if (key === "image") continue;
    const nested = obj[key];
    if (nested && typeof nested === "object") {
      const found = findImageInJsonLd(nested);
      if (found) return found;
    }
  }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/");
}
