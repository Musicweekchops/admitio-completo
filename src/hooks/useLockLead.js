// ============================================
// HOOK: useLockLead
// Gestiona el bloqueo de leads para evitar
// edición simultánea por múltiples usuarios
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { syncCrearAccion } from '../lib/storeSync'

const LOCK_DURATION_MINUTES = 5
const HEARTBEAT_INTERVAL_MS = 60000 // Renovar cada 1 minuto

export function useLockLead(leadId, user, isKeyMaster = false) {
  const [lockInfo, setLockInfo] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [isMyLock, setIsMyLock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const heartbeatRef = useRef(null)
  const channelRef = useRef(null)

  // Verificar si hay un lock activo en el lead
  const checkLock = useCallback(async () => {
    if (!isSupabaseConfigured() || !leadId || !user?.institucion_id) {
      setLoading(false)
      return null
    }

    try {
      // Primero limpiar locks expirados de este lead (ignorar errores)
      try {
        await supabase
          .from('lead_locks')
          .delete()
          .eq('lead_id', leadId)
          .lt('expires_at', new Date().toISOString())
      } catch (e) {
        // Ignorar errores de limpieza
      }

      // Buscar lock activo
      const { data, error: fetchError } = await supabase
        .from('lead_locks')
        .select('*')
        .eq('lead_id', leadId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (fetchError) {
        console.warn('⚠️ Error consultando lock:', fetchError.message)
        // No lanzar error, asumir que no hay lock
        setLockInfo(null)
        setIsLocked(false)
        setIsMyLock(false)
        setLoading(false)
        return null
      }

      if (data) {
        setLockInfo(data)
        setIsLocked(true)
        setIsMyLock(data.usuario_id === user.id)
      } else {
        setLockInfo(null)
        setIsLocked(false)
        setIsMyLock(false)
      }

      setLoading(false)
      return data
    } catch (err) {
      console.error('❌ Error verificando lock:', err)
      setError(err.message)
      setLoading(false)
      return null
    }
  }, [leadId, user?.id, user?.institucion_id])

  // Adquirir lock del lead
  const acquireLock = useCallback(async () => {
    if (!isSupabaseConfigured() || !leadId || !user?.id) {
      return { success: false, error: 'Configuración no disponible' }
    }

    try {
      // Verificar si ya hay un lock de otro usuario
      const existingLock = await checkLock()
      
      if (existingLock && existingLock.usuario_id !== user.id) {
        return { 
          success: false, 
          error: `${existingLock.usuario_nombre} está editando este lead`,
          lockedBy: existingLock
        }
      }

      // Si ya tengo el lock, solo renovarlo
      if (existingLock && existingLock.usuario_id === user.id) {
        return renewLock()
      }

      // Crear nuevo lock
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
      
      const { data, error: insertError } = await supabase
        .from('lead_locks')
        .upsert({
          lead_id: leadId,
          usuario_id: user.id,
          usuario_nombre: user.nombre,
          institucion_id: user.institucion_id,
          locked_at: new Date().toISOString(),
          expires_at: expiresAt
        }, {
          onConflict: 'lead_id'
        })
        .select()
        .single()

      if (insertError) throw insertError

      setLockInfo(data)
      setIsLocked(true)
      setIsMyLock(true)
      
      console.log('🔒 Lock adquirido:', data)
      
      // Iniciar heartbeat para mantener el lock
      startHeartbeat()
      
      return { success: true, lock: data }
    } catch (err) {
      console.error('❌ Error adquiriendo lock:', err)
      return { success: false, error: err.message }
    }
  }, [leadId, user, checkLock])

  // Renovar lock (heartbeat)
  const renewLock = useCallback(async () => {
    if (!isSupabaseConfigured() || !leadId || !user?.id) {
      return { success: false }
    }

    try {
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
      
      const { data, error: updateError } = await supabase
        .from('lead_locks')
        .update({ expires_at: expiresAt })
        .eq('lead_id', leadId)
        .eq('usuario_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      setLockInfo(data)
      console.log('🔄 Lock renovado:', expiresAt)
      
      return { success: true, lock: data }
    } catch (err) {
      console.error('⚠️ Error renovando lock:', err)
      return { success: false, error: err.message }
    }
  }, [leadId, user?.id])

  // Liberar lock
  const releaseLock = useCallback(async () => {
    if (!isSupabaseConfigured() || !leadId || !user?.id) {
      return { success: false }
    }

    try {
      stopHeartbeat()

      const { error: deleteError } = await supabase
        .from('lead_locks')
        .delete()
        .eq('lead_id', leadId)
        .eq('usuario_id', user.id)

      if (deleteError) throw deleteError

      setLockInfo(null)
      setIsLocked(false)
      setIsMyLock(false)
      
      console.log('🔓 Lock liberado')
      
      return { success: true }
    } catch (err) {
      console.error('❌ Error liberando lock:', err)
      return { success: false, error: err.message }
    }
  }, [leadId, user?.id])

  // KeyMaster toma control forzado
  const forceAcquireLock = useCallback(async (leadNombre) => {
    if (!isSupabaseConfigured() || !leadId || !user?.id || !isKeyMaster) {
      return { success: false, error: 'No autorizado' }
    }

    try {
      // Obtener info del lock actual antes de eliminarlo
      const currentLock = await checkLock()
      const previousUser = currentLock?.usuario_nombre || 'Usuario desconocido'

      // Eliminar lock existente
      await supabase
        .from('lead_locks')
        .delete()
        .eq('lead_id', leadId)

      // Crear nuevo lock para mí
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
      
      const { data, error: insertError } = await supabase
        .from('lead_locks')
        .insert({
          lead_id: leadId,
          usuario_id: user.id,
          usuario_nombre: user.nombre,
          institucion_id: user.institucion_id,
          locked_at: new Date().toISOString(),
          expires_at: expiresAt
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Registrar en historial del lead
      syncCrearAccion(leadId, {
        tipo: 'toma_control',
        descripcion: `${user.nombre} (KeyMaster) tomó el control del lead. ${previousUser} estaba editando.`
      }, user.id)

      setLockInfo(data)
      setIsLocked(true)
      setIsMyLock(true)
      
      console.log('⚠️ Control tomado forzadamente:', data)
      
      // Iniciar heartbeat
      startHeartbeat()
      
      return { success: true, lock: data, previousUser }
    } catch (err) {
      console.error('❌ Error tomando control:', err)
      return { success: false, error: err.message }
    }
  }, [leadId, user, isKeyMaster, checkLock])

  // Heartbeat para mantener el lock activo
  const startHeartbeat = useCallback(() => {
    stopHeartbeat()
    heartbeatRef.current = setInterval(() => {
      renewLock()
    }, HEARTBEAT_INTERVAL_MS)
    console.log('💓 Heartbeat iniciado')
  }, [renewLock])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
      console.log('💔 Heartbeat detenido')
    }
  }, [])

  // Suscribirse a cambios en tiempo real de locks
  useEffect(() => {
    if (!isSupabaseConfigured() || !leadId || !user?.institucion_id) return

    const channel = supabase
      .channel(`lock-${leadId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lead_locks', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          console.log('📡 Cambio en lock:', payload.eventType)
          checkLock()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [leadId, user?.institucion_id, checkLock])

  // Verificar lock al montar y limpiar al desmontar
  useEffect(() => {
    if (leadId && user?.id) {
      checkLock()
    }

    return () => {
      stopHeartbeat()
    }
  }, [leadId, user?.id, checkLock, stopHeartbeat])

  // Limpiar lock al cerrar ventana/pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isMyLock && leadId && user?.id) {
        // Usar sendBeacon para enviar de forma síncrona antes de cerrar
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lead_locks?lead_id=eq.${leadId}&usuario_id=eq.${user.id}`
        navigator.sendBeacon(url, JSON.stringify({ _method: 'DELETE' }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isMyLock, leadId, user?.id])

  return {
    // Estado
    lockInfo,
    isLocked,
    isMyLock,
    loading,
    error,
    
    // Acciones
    checkLock,
    acquireLock,
    releaseLock,
    renewLock,
    forceAcquireLock,
    
    // Helpers
    canEdit: !isLocked || isMyLock,
    lockedByName: lockInfo?.usuario_nombre || null,
    lockedSince: lockInfo?.locked_at || null
  }
}

export default useLockLead
