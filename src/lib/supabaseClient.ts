import { createClient, SupabaseClient } from '@supabase/supabase-js';

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

if (!envUrl || !envAnonKey) {
  console.error(
    '[Supabase] Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Please check your .env file.'
  );
}

const supabaseUrl = envUrl || 'https://tbftcuxwvotkjkwwmhou.supabase.co';
const supabaseAnonKey = envAnonKey || 'sb_publishable_9FAPn3q88UMB935Jrkg_9A_4pCfyuBS';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseClient: SupabaseClient = supabase;
