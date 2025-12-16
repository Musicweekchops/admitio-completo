// ============================================
// ADMITIO - Cliente Supabase
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Variables de Supabase no configuradas. El sistema funcionará en modo local.')
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Helper para verificar si Supabase está disponible
export const isSupabaseConfigured = () => {
  return supabase !== null
}
