// ============================================
// ADMITIO - Cliente Supabase (ÚNICO)
// src/lib/supabase.js
// ============================================
// IMPORTANTE: Este debe ser el ÚNICO archivo que crea el cliente Supabase
// No crear instancias adicionales en otros archivos

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

// Crear cliente Supabase - SINGLETON
let supabaseInstance = null

if (isConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // CRÍTICO: Refrescar tokens automáticamente
      autoRefreshToken: true,
      
      // CRÍTICO: Persistir sesión en localStorage
      // Sin esto, la sesión se pierde en modo incógnito o al recargar
      persistSession: true,
      
      // CRÍTICO: Detectar tokens en URL (para confirmación de email, magic links)
      detectSessionInUrl: true,
      
      // Storage key único para evitar conflictos
      storageKey: 'admitio-auth',
      
      // Flujo PKCE para mayor seguridad
      flowType: 'pkce'
    },
    
    // Headers personalizados
    global: {
      headers: {
        'x-client-info': 'admitio-web'
      }
    },
    
    // Configuración de Realtime
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  })
  
  console.log('✅ Cliente Supabase inicializado correctamente')
}

// Exportar el cliente (puede ser null si no está configurado)
export const supabase = supabaseInstance

// Helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => {
  return isConfigured && supabase !== null
}

// Helper para obtener la URL del proyecto
export const getSupabaseUrl = () => supabaseUrl

// Helper para obtener la anon key
export const getSupabaseAnonKey = () => supabaseAnonKey

// Exportar por defecto
export default supabase
