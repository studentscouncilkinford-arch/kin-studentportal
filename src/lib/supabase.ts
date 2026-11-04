import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://erpldcmiqeffqcjacxzr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZFw6dLN5D9M_8FmNwRTs7w_454FZ_5-';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
