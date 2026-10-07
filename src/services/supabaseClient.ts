import { isSupabaseConfigured as checkSupabaseConfiguration, supabase } from "../lib/supabase";

export const isSupabaseConfigured = checkSupabaseConfiguration();
export { supabase };
