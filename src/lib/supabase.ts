import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey !== 'your-anon-key-here'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // Keep the admin session within this browser tab so moving from the
      // dashboard to the scanner (or refreshing it) does not ask for login again.
      // sessionStorage is cleared when the tab is closed.
      persistSession: true,
      storage: window.sessionStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
