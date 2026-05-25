"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  type Vote,
} from "@/lib/supabase";
import type { ActivityKey } from "@/lib/activities";
import { normalizeName } from "@/lib/utils";

export type VoteSelection = Record<ActivityKey, boolean>;

export type VoteInput = {
  user_name: string;
  hotel_info: string | null;
  selection: VoteSelection;
};

export type UseVotesResult = {
  votes: Vote[];
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  isConfigured: boolean;
  reload: () => Promise<void>;
  saveVote: (input: VoteInput) => Promise<Vote | null>;
};

const TABLE = "mallorca_votes";

export function useVotes(): UseVotesResult {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!configured) {
      setVotes([]);
      setIsLoading(false);
      setLoadError(
        "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
      );
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (mountedRef.current) {
        setVotes((data as Vote[]) ?? []);
      }
    } catch (error) {
      if (mountedRef.current) {
        const message =
          error instanceof Error
            ? error.message
            : "Stimmen konnten nicht geladen werden.";
        setLoadError(message);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [configured]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Realtime: bei Inserts/Updates/Deletes neu laden.
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("mallorca_votes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        () => {
          if (!cancelled) void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [configured, load]);

  const saveVote = useCallback<UseVotesResult["saveVote"]>(
    async ({ user_name, hotel_info, selection }) => {
      if (!configured) {
        setSaveError(
          "Supabase ist nicht konfiguriert. Bitte erst die Environment-Variablen setzen.",
        );
        return null;
      }

      const cleanedName = normalizeName(user_name);
      if (!cleanedName) {
        setSaveError("Bitte gib deinen Namen ein.");
        return null;
      }

      setIsSaving(true);
      setSaveError(null);
      try {
        const supabase = getSupabaseClient();

        const payload = {
          user_name: cleanedName,
          hotel_info: hotel_info?.trim() ? hotel_info.trim() : null,
          ebike_tour: !!selection.ebike_tour,
          roller_tour: !!selection.roller_tour,
          schnorcheln: !!selection.schnorcheln,
          bootsausflug: !!selection.bootsausflug,
          megapark: !!selection.megapark,
        };

        // Vorhandenen Teilnehmer per case-insensitive Name suchen,
        // bevorzugt updaten statt Duplikat anlegen.
        const { data: existingRaw, error: lookupError } = await supabase
          .from(TABLE)
          .select("id")
          .ilike("user_name", cleanedName)
          .limit(1)
          .maybeSingle();
        if (lookupError) throw lookupError;
        const existing = existingRaw as { id: number } | null;

        let result: Vote | null = null;

        if (existing?.id) {
          const { data, error } = await supabase
            .from(TABLE)
            .update(payload)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          result = data as Vote;
        } else {
          const { data, error } = await supabase
            .from(TABLE)
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          result = data as Vote;
        }

        if (mountedRef.current && result) {
          setVotes((prev) => {
            const idx = prev.findIndex((v) => v.id === result!.id);
            if (idx === -1) return [...prev, result!];
            const copy = prev.slice();
            copy[idx] = result!;
            return copy;
          });
        }

        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Das hat leider nicht geklappt. Bitte versuche es noch einmal.";
        if (mountedRef.current) setSaveError(message);
        return null;
      } finally {
        if (mountedRef.current) setIsSaving(false);
      }
    },
    [configured],
  );

  return {
    votes,
    isLoading,
    isSaving,
    loadError,
    saveError,
    isConfigured: configured,
    reload: load,
    saveVote,
  };
}
