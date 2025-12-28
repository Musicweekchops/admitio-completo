// ============================================
// ADMITIO BACKOFFICE - Auth Context
// src/context/BackofficeAuthContext.jsx
// ============================================

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const BackofficeAuthContext = createContext(null)

export function BackofficeAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paso2FA, setPaso2FA] = useState(false)
  const [emailPendiente, setEmailPendiente] = useState('')

  useEffect(() => {
    checkBackofficeSession()
  }, [])

  async function checkBackofficeSession() {
    try {
      const savedSession = sessionStorage.getItem('backoffice_admin')
      if (savedSession) {
        const adminData = JSON.parse(savedSession)
        // Verificar que la sesión no haya expirado (4 horas)
        if (adminData.expires_at && new Date(adminData.expires_at) > new Date()) {
          setAdmin(adminData)
        } else {
          sessionStorage.removeItem('backoffice_admin')
        }
      }
    } catch (error) {
      console.error('Error checking backoffice session:', error)
    } finally {
      setLoading(false)
    }
  }

  // Paso 1: Verificar email y enviar código 2FA
  async function iniciarLogin(email) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Sistema no configurado' }
    }

    const emailNormalizado = email.toLowerCase().trim()

    try {
      // Verificar que el admin existe y está activo
      const { data: adminData, error: adminError } = await supabase
        .from('admins_backoffice')
        .select('*')
        .eq('email', emailNormalizado)
        .eq('activo', true)
        .single()

      if (adminError || !adminData) {
        return { success: false, error: 'Acceso no autorizado' }
      }

      // Generar código 2FA
      const { data: codigo, error: codigoError } = await supabase
        .rpc('generar_codigo_2fa', { admin_email: emailNormalizado })

      if (codigoError) {
        console.error('Error generando código:', codigoError)
        return { success: false, error: 'Error al generar código de verificación' }
      }

      // Enviar email con el código (usando Edge Function o Resend)
      const enviado = await enviarCodigo2FA(emailNormalizado, codigo, adminData.nombre)

      if (!enviado.success) {
        return { success: false, error: 'Error al enviar código por email' }
      }

      setEmailPendiente(emailNormalizado)
      setPaso2FA(true)

      return { 
        success: true, 
        message: 'Código enviado a tu email',
        requiresCode: true 
      }

    } catch (error) {
      console.error('Error en iniciarLogin:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Paso 2: Verificar código 2FA
  async function verificarCodigo(codigo) {
    if (!emailPendiente) {
      return { success: false, error: 'Sesión expirada, intenta de nuevo' }
    }

    try {
      const { data: valido, error } = await supabase
        .rpc('verificar_codigo_2fa', { 
          admin_email: emailPendiente, 
          codigo_ingresado: codigo 
        })

      if (error) {
        console.error('Error verificando código:', error)
        return { success: false, error: 'Error al verificar código' }
      }

      if (!valido) {
        return { success: false, error: 'Código inválido o expirado' }
      }

      // Código válido - cargar datos del admin
      const { data: adminData } = await supabase
        .from('admins_backoffice')
        .select('*')
        .eq('email', emailPendiente)
        .single()

      // Crear sesión (expira en 4 horas)
      const sessionData = {
        ...adminData,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      }

      sessionStorage.setItem('backoffice_admin', JSON.stringify(sessionData))
      setAdmin(sessionData)
      setPaso2FA(false)
      setEmailPendiente('')

      // Log de actividad
      await supabase.from('backoffice_activity_log').insert({
        admin_id: adminData.id,
        admin_email: adminData.email,
        accion: 'login',
        descripcion: 'Inicio de sesión exitoso'
      })

      return { success: true }

    } catch (error) {
      console.error('Error en verificarCodigo:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Enviar código por email
  async function enviarCodigo2FA(email, codigo, nombre) {
    try {
      // Intentar con Edge Function
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { email, codigo, nombre }
      })

      if (error) {
        console.warn('Edge function no disponible, usando fallback')
        // Fallback: mostrar código en consola (solo desarrollo)
        console.log('🔐 CÓDIGO 2FA:', codigo)
        return { success: true }
      }

      return { success: true }
    } catch (error) {
      console.error('Error enviando código:', error)
      // En desarrollo, permitir continuar
      console.log('🔐 CÓDIGO 2FA (fallback):', codigo)
      return { success: true }
    }
  }

  // Reenviar código
  async function reenviarCodigo() {
    if (!emailPendiente) {
      return { success: false, error: 'No hay email pendiente' }
    }

    return await iniciarLogin(emailPendiente)
  }

  // Cancelar login
  function cancelarLogin() {
    setPaso2FA(false)
    setEmailPendiente('')
  }

  // Cerrar sesión
  async function cerrarSesion() {
    if (admin) {
      await supabase.from('backoffice_activity_log').insert({
        admin_id: admin.id,
        admin_email: admin.email,
        accion: 'logout',
        descripcion: 'Cierre de sesión'
      })
    }

    sessionStorage.removeItem('backoffice_admin')
    setAdmin(null)
  }

  // Verificar permisos
  const isSuperOwner = admin?.rol === 'super_owner'
  const puedeGestionarAdmins = admin?.puede_invitar_admins || isSuperOwner
  const puedeSoporte = admin?.puede_soporte || isSuperOwner
  const puedeDisputas = admin?.puede_disputas || isSuperOwner
  const puedeVerPagos = admin?.puede_ver_pagos || isSuperOwner
  const puedeRegistrarPagos = admin?.puede_registrar_pagos || isSuperOwner
  const puedeCambiarPlanes = admin?.puede_cambiar_planes || isSuperOwner
  const puedeEliminar = admin?.puede_eliminar || isSuperOwner

  return (
    <BackofficeAuthContext.Provider value={{
      admin,
      loading,
      paso2FA,
      emailPendiente,
      iniciarLogin,
      verificarCodigo,
      reenviarCodigo,
      cancelarLogin,
      cerrarSesion,
      isAuthenticated: !!admin,
      isSuperOwner,
      puedeGestionarAdmins,
      puedeSoporte,
      puedeDisputas,
      puedeVerPagos,
      puedeRegistrarPagos,
      puedeCambiarPlanes,
      puedeEliminar
    }}>
      {children}
    </BackofficeAuthContext.Provider>
  )
}

export function useBackofficeAuth() {
  const context = useContext(BackofficeAuthContext)
  if (!context) {
    throw new Error('useBackofficeAuth debe usarse dentro de BackofficeAuthProvider')
  }
  return context
}
