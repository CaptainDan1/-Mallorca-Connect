"use client";

import { useRef, useState, type ReactNode } from "react";
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
  /** Wenn gesetzt, wird der Inhalt klickbar gemacht und der Trigger
   *  rendert sich nicht als eigenstaendiger Button mit Beschriftung,
   *  sondern nur als Hot-Spot um den Avatar. */
  children?: ReactNode;
  /** Visuelles Label fuer den Trigger (nur ohne `children`). */
  label?: string;
};

export function AvatarUpload({
  participantId,
  disabled,
  onUploaded,
  children,
  label = "Profilfoto hochladen",
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

  // Variante 1: Avatar selbst als Trigger (children gegeben).
  if (children) {
    return (
      <>
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
          aria-label={label}
          className="group relative inline-flex items-center justify-center rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {children}
          <span
            className={
              "pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 text-white transition " +
              (isUploading
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")
            }
            aria-hidden="true"
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Camera size={18} />
            )}
          </span>
        </button>
        {error && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            {error}
          </p>
        )}
      </>
    );
  }

  // Variante 2 (Fallback / Legacy): klassischer Button + Hinweis.
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
        {isUploading ? "Lade hoch..." : label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
