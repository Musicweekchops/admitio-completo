// ============================================
// ADMITIO - Cliente Supabase
// src/lib/supabase.js
// ============================================

import { createClient } from '@supabase/supabase-js'

// Variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validar configuración
const isConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isConfigured) {
  console.warn('⚠️ Variables de Supabase no configuradas:')
  console.warn('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.warn('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
  console.warn('   La app funcionará en modo local/demo')
}

// Crear cliente Supabase
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Refrescar tokens automáticamente
        autoRefreshToken: true,
        // Persistir sesión en localStorage
        persistSession: true,
        // Detectar tokens en URL (para magic links y confirmaciones)
        detectSessionInUrl: true,
        // Storage key personalizado
        storageKey: 'admitio-auth',
        // Flujo de autenticación
        flowType: 'pkce'
      },
      // Configuración global de fetch
      global: {
        headers: {
          'x-client-info': 'admitio-web'
        }
      },
      // Configuración de realtime (opcional)
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    })
  : null

// Helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => isConfigured && supabase !== null

// Helper para obtener la URL del proyecto
export const getSupabaseUrl = () => supabaseUrl

// Helper para obtener la anon key (útil para embeds)
export const getSupabaseAnonKey = () => supabaseAnonKey

// Exportar por defecto
export default supabase
