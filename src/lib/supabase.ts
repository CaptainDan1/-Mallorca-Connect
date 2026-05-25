import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Vote = {
  id: number;
  created_at: string;
  user_name: string;
  hotel_info: string | null;
  ebike_tour: boolean;
  roller_tour: boolean;
  schnorcheln: boolean;
  bootsausflug: boolean;
  megapark: boolean;
};

export type VotePayload = Omit<Vote, "id" | "created_at">;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
    );
  }
  cached = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
