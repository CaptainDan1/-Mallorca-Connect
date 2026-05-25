"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  PARTICIPANTS_TABLE,
  PARTICIPANT_ID_STORAGE_KEY,
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
};

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
          .select("id, display_name, hotel_info, avatar_url, created_at, updated_at")
          .eq("id", storedId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled || !mountedRef.current) return;
        if (data) {
          setParticipant(data as ParticipantProfile);
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
    async ({ display_name, hotel_info }) => {
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

      setIsSaving(true);
      setSaveError(null);

      try {
        const supabase = getSupabaseClient();
        const cleanedHotel = hotel_info?.trim() ? hotel_info.trim() : null;
        const payload = {
          display_name: cleanedName,
          hotel_info: cleanedHotel,
        };

        let targetId = participant?.id ?? null;

        if (!targetId) {
          // Bei neuem Profil: erst nach existierendem Namen suchen, um
          // Wiedererkennung auf einem neuen Geraet zu ermoeglichen.
          const { data: existingRaw, error: lookupError } = await supabase
            .from(PARTICIPANTS_TABLE)
            .select("id")
            .ilike("display_name", cleanedName)
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
            .select("id, display_name, hotel_info, avatar_url, created_at, updated_at")
            .single();
          if (error) throw error;
          result = data as ParticipantProfile;
        } else {
          const { data, error } = await supabase
            .from(PARTICIPANTS_TABLE)
            .insert(payload)
            .select("id, display_name, hotel_info, avatar_url, created_at, updated_at")
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

  return {
    participant,
    isLoading,
    isSaving,
    loadError,
    saveError,
    saveProfile,
  };
}
