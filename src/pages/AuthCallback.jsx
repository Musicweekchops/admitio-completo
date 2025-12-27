// ============================================
// ADMITIO - Página de Auth Callback
// src/pages/AuthCallback.jsx
// ============================================
// Esta página maneja los redirects de:
// - Verificación de email
// - Reset de contraseña
// - Magic links
// ============================================

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { GraduationCap, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [estado, setEstado] = useState('procesando') // procesando, exito, error
  const [mensaje, setMensaje] = useState('')
  const [tipo, setTipo] = useState('') // signup, recovery, invite

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setEstado('error')
      setMensaje('Supabase no está configurado')
      return
    }

    procesarCallback()
  }, [])

  const procesarCallback = async () => {
    try {
      // Supabase maneja automáticamente el token en la URL
      // Solo necesitamos verificar la sesión
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error en callback:', error)
        throw error
      }

      // Detectar el tipo de callback por los parámetros de URL
      const type = searchParams.get('type')
      const errorCode = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      // Si hay error en la URL
      if (errorCode) {
        throw new Error(errorDescription || 'Error en la verificación')
      }

      // Determinar tipo de callback
      if (type === 'recovery') {
        setTipo('recovery')
        setEstado('exito')
        setMensaje('Ahora puedes cambiar tu contraseña')
        
        // Redirigir a página de cambio de contraseña después de 2 segundos
        setTimeout(() => {
          navigate('/cambiar-password', { replace: true })
        }, 2000)
        return
      }

      if (type === 'signup' || type === 'email') {
        setTipo('signup')
        
        if (session?.user) {
          // Verificar que el usuario exista en nuestra tabla
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('id, nombre, email_verificado')
            .eq('auth_id', session.user.id)
            .single()

          if (userError && userError.code !== 'PGRST116') {
            throw userError
          }

          // Actualizar email_verificado en nuestra tabla
          if (userData && !userData.email_verificado) {
            await supabase
              .from('usuarios')
              .update({ email_verificado: true })
              .eq('auth_id', session.user.id)
          }

          setEstado('exito')
          setMensaje('¡Tu cuenta ha sido verificada correctamente!')
          
          // Redirigir al dashboard después de 2 segundos
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 2000)
        } else {
          // No hay sesión, puede que el token haya expirado
          throw new Error('El enlace ha expirado o ya fue utilizado')
        }
        return
      }

      if (type === 'invite') {
        setTipo('invite')
        setEstado('exito')
        setMensaje('Invitación aceptada. Configura tu contraseña.')
        
        setTimeout(() => {
          navigate('/cambiar-password', { replace: true })
        }, 2000)
        return
      }

      // Si hay sesión pero no sabemos el tipo, verificar
      if (session?.user) {
        setTipo('signup')
        setEstado('exito')
        setMensaje('Sesión iniciada correctamente')
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 2000)
      } else {
        throw new Error('No se pudo procesar la verificación')
      }

    } catch (error) {
      console.error('Error procesando callback:', error)
      setEstado('error')
      setMensaje(error.message || 'Error al verificar tu cuenta')
    }
  }

  const handleIrALogin = () => {
    navigate('/login', { replace: true })
  }

  const handleReenviarEmail = async () => {
    // Obtener email del localStorage si existe
    const savedEmail = localStorage.getItem('admitio_pending_email')
    
    if (savedEmail) {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: savedEmail
        })
        
        if (error) throw error
        
        alert('Email de verificación reenviado. Revisa tu bandeja de entrada.')
      } catch (err) {
        alert('Error al reenviar: ' + err.message)
      }
    } else {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Admitio</span>
        </div>

        {/* Procesando */}
        {estado === 'procesando' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Verificando...
            </h2>
            <p className="text-gray-600">
              Por favor espera un momento
            </p>
          </div>
        )}

        {/* Éxito */}
        {estado === 'exito' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {tipo === 'recovery' ? '¡Listo!' : '¡Cuenta verificada!'}
            </h2>
            <p className="text-gray-600 mb-6">{mensaje}</p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Redirigiendo...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {estado === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Error de verificación
            </h2>
            <p className="text-gray-600 mb-6">{mensaje}</p>

            {/* Sugerencias */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium mb-1">
                    Posibles causas:
                  </p>
                  <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                    <li>El enlace ha expirado (válido por 24 horas)</li>
                    <li>El enlace ya fue utilizado</li>
                    <li>Hubo un problema de conexión</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleReenviarEmail}
                className="w-full py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors"
              >
                Reenviar email de verificación
              </button>
              
              <button
                onClick={handleIrALogin}
                className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ir al login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
