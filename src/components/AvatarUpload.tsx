"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  AVATAR_ALLOWED_MIME_TYPES,
  uploadAvatar,
  validateAvatarFile,
} from "@/lib/storage";

type AvatarUploadProps = {
  participantId: string;
  disabled?: boolean;
  onUploaded: (publicUrl: string) => Promise<void> | void;
};

export function AvatarUpload({
  participantId,
  disabled,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptAttr = AVATAR_ALLOWED_MIME_TYPES.join(",");

  function openPicker() {
    if (disabled || isUploading) return;
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset, damit dieselbe Datei nochmal ausgewaehlt werden kann.
    event.target.value = "";
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const { publicUrl } = await uploadAvatar(participantId, file);
      await onUploaded(publicUrl);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Upload hat nicht geklappt.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={handleChange}
        disabled={disabled || isUploading}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || isUploading}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Camera size={14} />
        )}
        {isUploading ? "Lade hoch..." : "Profilfoto hochladen"}
      </button>
      <p className="text-xs text-slate-500">
        JPG, PNG oder WebP, bis 2 MB.
      </p>
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
