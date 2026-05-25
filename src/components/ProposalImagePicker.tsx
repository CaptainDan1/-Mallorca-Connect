"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  EVENT_IMAGE_ALLOWED_MIME_TYPES,
  validateEventImageFile,
} from "@/lib/storage";

type ProposalImagePickerProps = {
  /**
   * Aktuelle URL aus der DB (z. B. nach dem Laden eines bestehenden
   * Vorschlags). Wird als Vorschau angezeigt, solange noch keine neue
   * Datei ausgewaehlt wurde.
   */
  currentImagePath?: string | null;
  /** Disabled-Zustand, z. B. waehrend des Speicherns. */
  disabled?: boolean;
  /**
   * Wird mit `null` aufgerufen, wenn der Nutzer die Datei wieder entfernt
   * (vor dem Hochladen). Mit einem `File`-Objekt, sobald eine gueltige
   * Datei ausgewaehlt wurde. Der Parent entscheidet, wann hochgeladen
   * wird.
   */
  onFileChange: (file: File | null) => void;
  /** Sichtbarer Loading-State, falls der Upload bereits laeuft. */
  isUploading?: boolean;
};

export function ProposalImagePicker({
  currentImagePath,
  disabled,
  onFileChange,
  isUploading,
}: ProposalImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptAttr = EVENT_IMAGE_ALLOWED_MIME_TYPES.join(",");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!next) return;

    const validation = validateEventImageFile(next);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setFile(next);
    onFileChange(next);
  }

  function clearFile() {
    setFile(null);
    setError(null);
    onFileChange(null);
  }

  function openPicker() {
    if (disabled || isUploading) return;
    inputRef.current?.click();
  }

  const previewSrc = previewUrl ?? currentImagePath ?? null;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={handleChange}
        disabled={disabled || isUploading}
      />

      {previewSrc ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Event-Foto-Vorschau"
            className="h-48 w-full object-cover sm:h-56"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {file && !isUploading && (
            <button
              type="button"
              onClick={clearFile}
              disabled={disabled}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-soft transition hover:bg-white"
              aria-label="Auswahl entfernen"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-stone-50 px-4 py-6 text-center">
          <p className="text-sm text-slate-500">
            Noch kein Foto ausgewaehlt.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus size={14} />
          {previewSrc ? "Foto ersetzen" : "Foto auswaehlen"}
        </button>
        {file && (
          <button
            type="button"
            onClick={clearFile}
            disabled={disabled || isUploading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Auswahl verwerfen
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">JPG, PNG oder WebP, bis 5 MB.</p>
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
