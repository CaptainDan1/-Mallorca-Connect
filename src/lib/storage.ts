import { getSupabaseClient } from "@/lib/supabase";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type AvatarUploadResult = {
  publicUrl: string;
  path: string;
};

export function validateAvatarFile(file: File): string | null {
  if (
    !(AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return "Bitte ein JPG-, PNG- oder WebP-Bild auswaehlen.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Bild ist groesser als 2 MB. Bitte ein kleineres Foto waehlen.";
  }
  return null;
}

export async function uploadAvatar(
  participantId: string,
  file: File,
): Promise<AvatarUploadResult> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const path = `participants/${participantId}.${ext}`;

  const supabase = getSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    });
  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // Cache-Busting per Query-Param, damit Browser ein ueberschriebenes
  // Bild nicht aus dem Cache zeigen.
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { publicUrl, path };
}
