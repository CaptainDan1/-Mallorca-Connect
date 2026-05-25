import { getSupabaseClient } from "@/lib/supabase";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const EVENT_IMAGES_BUCKET = "event-images";
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const EVENT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadResult = {
  publicUrl: string;
  path: string;
};

// --- Avatare ---------------------------------------------------------

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
): Promise<UploadResult> {
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
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { publicUrl, path };
}

// --- Event-Bilder ----------------------------------------------------

export function validateEventImageFile(file: File): string | null {
  if (
    !(EVENT_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return "Bitte ein JPG-, PNG- oder WebP-Bild auswaehlen.";
  }
  if (file.size > EVENT_IMAGE_MAX_BYTES) {
    return "Bild ist groesser als 5 MB. Bitte ein kleineres Foto waehlen.";
  }
  return null;
}

export async function uploadEventImage(
  proposalId: string,
  file: File,
): Promise<UploadResult> {
  const validationError = validateEventImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const path = `proposals/${proposalId}.${ext}`;

  const supabase = getSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(EVENT_IMAGES_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    });
  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(EVENT_IMAGES_BUCKET)
    .getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { publicUrl, path };
}
