// Server-only Helfer. Niemals aus Client-Komponenten importieren.
import bcrypt from "bcryptjs";

// 10 Rounds: solider Default, akzeptable Performance auf Vercel-
// Serverless. Keine Notwendigkeit hochzudrehen -- siehe Kommentar in
// credentials.ts: dies ist KEIN echtes Auth-System.
const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
