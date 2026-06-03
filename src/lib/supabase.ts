import { createClient } from '@supabase/supabase-js';

const cleanEnvValue = (value?: string) => value?.trim() ?? '';
const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
export const supabasePublicKey =
  cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  cleanEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export const SUPABASE_MEETINGS_TABLE = 'meetings';

export const supabaseConfigMessage = !supabaseUrl
  ? 'Set VITE_SUPABASE_URL to your Supabase project URL'
  : !isHttpUrl(supabaseUrl)
    ? 'VITE_SUPABASE_URL must be a full http(s) Supabase project URL'
    : !supabasePublicKey
      ? 'Set VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) to enable collaboration'
      : 'Collaboration ready';

export const isSupabaseConfigured =
  isHttpUrl(supabaseUrl) && Boolean(supabasePublicKey);

export const supabase =
  isSupabaseConfigured && supabaseUrl && supabasePublicKey
    ? createClient(supabaseUrl, supabasePublicKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      })
    : null;
