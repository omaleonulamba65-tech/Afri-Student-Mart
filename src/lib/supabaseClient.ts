import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://tbftcuxwvotkjkwwmhou.supabase.co';
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_9FAPn3q88UMB935Jrkg_9A_4pCfyuBS';

export const supabaseClient: SupabaseClient = createClient(url, anonKey);
