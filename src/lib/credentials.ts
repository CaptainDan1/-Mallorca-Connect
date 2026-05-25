export const PARTICIPANT_CREDENTIALS_TABLE = "participant_credentials";

// Mindestlaenge fuer das Wiedererkennungs-Kennwort. Bewusst kurz und
// ohne komplizierte Sonderzeichenregeln -- es geht NICHT um echte
// Account-Sicherheit, sondern um eine pragmatische Profil-Wiedererkennung.
export const MIN_PASSWORD_LENGTH = 6;

export type ParticipantCredentialRow = {
  participant_id: string;
  email_normalized: string;
  password_hash: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};
