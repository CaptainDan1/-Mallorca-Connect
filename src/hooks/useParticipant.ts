"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  LAST_SEEN_REFRESH_MS,
  PARTICIPANTS_TABLE,
  PARTICIPANT_ID_STORAGE_KEY,
  isLikelyEmail,
  normalizeEmail,
  type ParticipantInput,
  type ParticipantProfile,
} from "@/lib/participants";
import { normalizeName } from "@/lib/utils";

export type UseParticipantResult = {
  participant: ParticipantProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  saveProfile: (input: ParticipantInput) => Promise<ParticipantProfile | null>;
  isUpdatingAvatar: boolean;
  avatarError: string | null;
  updateAvatarUrl: (
    url: string | null,
  ) => Promise<ParticipantProfile | null>;
};

const PROFILE_COLUMNS =
  "id, display_name, hotel_info, avatar_url, email, last_seen_at, created_at, updated_at";

function shouldRefreshLastSeen(value: string | null | undefined): boolean {
  if (!value) return true;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > LAST_SEEN_REFRESH_MS;
}

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(PARTICIPANT_ID_STORAGE_KEY);
    }
  } catch {
    // localStorage kann blockiert sein -- still erlaubt.
  }
}

export function useParticipant(): UseParticipantResult {
  const [participant, setParticipant] = useState<ParticipantProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const storedId = readStoredId();

    if (!storedId) {
      setIsLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    if (!configured) {
      setIsLoading(false);
      setLoadError(
        "Supabase ist nicht konfiguriert. Profil konnte nicht geladen werden.",
      );
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from(PARTICIPANTS_TABLE)
          .select(PROFILE_COLUMNS)
          .eq("id", storedId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled || !mountedRef.current) return;
        if (data) {
          const profile = data as ParticipantProfile;
          setParticipant(profile);
          // last_seen_at sanft mitfuehren: hoechstens einmal pro
          // LAST_SEEN_REFRESH_MS, damit kein Render-Loop entsteht.
          if (shouldRefreshLastSeen(profile.last_seen_at)) {
            const nowIso = new Date().toISOString();
            void supabase
              .from(PARTICIPANTS_TABLE)
              .update({ last_seen_at: nowIso })
              .eq("id", profile.id)
              .select(PROFILE_COLUMNS)
              .single()
              .then(({ data: updated, error: updateError }) => {
                if (updateError || !updated) return;
                if (!mountedRef.current) return;
                setParticipant(updated as ParticipantProfile);
              });
          }
        } else {
          // Stored ID existiert nicht (mehr) in der DB -> verwerfen.
          writeStoredId(null);
        }
      } catch (error) {
        if (cancelled || !mountedRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : "Profil konnte nicht geladen werden.";
        setLoadError(message);
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [configured]);

  const saveProfile = useCallback<UseParticipantResult["saveProfile"]>(
    async ({ display_name, hotel_info, email }) => {
      if (!configured) {
        setSaveError(
          "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
        );
        return null;
      }

      const cleanedName = normalizeName(display_name);
      if (!cleanedName) {
        setSaveError("Bitte gib deinen Namen ein.");
        return null;
      }

      const cleanedEmail = normalizeEmail(email);
      if (!cleanedEmail) {
        setSaveError(
          "Bitte gib deine E-Mail an. Sie wird nicht oeffentlich angezeigt.",
        );
        return null;
      }
      if (!isLikelyEmail(cleanedEmail)) {
        setSaveError("Diese E-Mail sieht nicht ganz richtig aus.");
        return null;
      }

      setIsSaving(true);
      setSaveError(null);

      try {
        const supabase = getSupabaseClient();
        const cleanedHotel = hotel_info?.trim() ? hotel_info.trim() : null;
        const payload = {
          display_name: cleanedName,
          hotel_info: cleanedHotel,
          email: cleanedEmail,
          last_seen_at: new Date().toISOString(),
        };

        // Wiedererkennung:
        //   1. participant.id (aus localStorage geladen) hat Vorrang.
        //   2. Sonst Suche nach gleicher E-Mail (case-insensitiv).
        //   Name-Fallback bewusst entfernt -- Namen sind nicht eindeutig.
        let targetId = participant?.id ?? null;

        if (!targetId) {
          const { data: existingRaw, error: lookupError } = await supabase
            .from(PARTICIPANTS_TABLE)
            .select("id")
            .ilike("email", cleanedEmail)
            .limit(1)
            .maybeSingle();
          if (lookupError) throw lookupError;
          const existing = existingRaw as { id: string } | null;
          if (existing?.id) {
            targetId = existing.id;
          }
        }

        let result: ParticipantProfile | null = null;

        if (targetId) {
          const { data, error } = await supabase
            .from(PARTICIPANTS_TABLE)
            .update(payload)
            .eq("id", targetId)
            .select(PROFILE_COLUMNS)
            .single();
          if (error) throw error;
          result = data as ParticipantProfile;
        } else {
          const { data, error } = await supabase
            .from(PARTICIPANTS_TABLE)
            .insert(payload)
            .select(PROFILE_COLUMNS)
            .single();
          if (error) throw error;
          result = data as ParticipantProfile;
        }

        if (result) {
          writeStoredId(result.id);
          if (mountedRef.current) {
            setParticipant(result);
          }
        }
        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Profil konnte nicht gespeichert werden.";
        if (mountedRef.current) setSaveError(message);
        return null;
      } finally {
        if (mountedRef.current) setIsSaving(false);
      }
    },
    [configured, participant?.id],
  );

  const updateAvatarUrl = useCallback<UseParticipantResult["updateAvatarUrl"]>(
    async (url) => {
      if (!participant?.id) {
        setAvatarError(
          "Bitte speichere zuerst dein Profil, bevor du ein Foto hinzufuegst.",
        );
        return null;
      }
      if (!configured) {
        setAvatarError(
          "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
        );
        return null;
      }

      setIsUpdatingAvatar(true);
      setAvatarError(null);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from(PARTICIPANTS_TABLE)
          .update({ avatar_url: url })
          .eq("id", participant.id)
          .select(PROFILE_COLUMNS)
          .single();
        if (error) throw error;
        const result = data as ParticipantProfile;
        if (mountedRef.current) {
          setParticipant(result);
        }
        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Profilbild konnte nicht gespeichert werden.";
        if (mountedRef.current) setAvatarError(message);
        return null;
      } finally {
        if (mountedRef.current) setIsUpdatingAvatar(false);
      }
    },
    [participant?.id, configured],
  );

  return {
    participant,
    isLoading,
    isSaving,
    loadError,
    saveError,
    saveProfile,
    isUpdatingAvatar,
    avatarError,
    updateAvatarUrl,
  };
}
