// ============================================
// ADMITIO - Página de Auth Callback
// src/pages/AuthCallback.jsx
// Maneja PKCE Auth Code Flow (?code=) y Legacy (#access_token=)
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GraduationCap, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('procesando');
  const [mensaje, setMensaje] = useState('Verificando tu cuenta...');
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setEstado('error');
      setMensaje('Supabase no está configurado');
      return;
    }

    procesarCallback();
  }, []);

  const procesarCallback = async () => {
    try {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = url.searchParams;

      // Detectar errores en URL primero
      const errorCode = hashParams.get('error') || queryParams.get('error');
      const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
      
      if (errorCode) {
        throw new Error(errorDesc || `Error: ${errorCode}`);
      }

      // ========================================
      // PKCE AUTH CODE FLOW (Supabase moderno)
      // ========================================
      const code = queryParams.get('code');
      
      if (code) {
        console.log('🔐 Auth Code Flow detectado, intercambiando código...');
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('❌ Error intercambiando código:', exchangeError);
          
          // Errores específicos
          if (exchangeError.message.includes('expired')) {
            throw new Error('El enlace ha expirado. Solicita uno nuevo.');
          }
          if (exchangeError.message.includes('already been used')) {
            throw new Error('Este enlace ya fue utilizado. Si ya verificaste, inicia sesión.');
          }
          
          throw new Error(exchangeError.message);
        }

        if (!data.session) {
          throw new Error('No se pudo establecer la sesión');
        }

        console.log('✅ Código intercambiado exitosamente');
        
        // Limpiar URL (remover ?code=)
        window.history.replaceState(null, '', window.location.pathname);
        
        // Continuar con el flujo normal
        await procesarSesion(data.session, queryParams.get('type'));
        return;
      }

      // ========================================
      // LEGACY IMPLICIT FLOW (#access_token=)
      // ========================================
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        console.log('🔐 Implicit Flow detectado (legacy)');
        
        // Supabase JS debería haberlo procesado automáticamente
        // Solo esperamos un momento y obtenemos la sesión
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          throw new Error('No se pudo obtener la sesión del token');
        }
        
        // Limpiar hash de la URL
        window.history.replaceState(null, '', window.location.pathname);
        
        await procesarSesion(session, hashParams.get('type'));
        return;
      }

      // ========================================
      // SIN CÓDIGO NI TOKEN - Verificar sesión existente
      // ========================================
      console.log('⚠️ No se detectó code ni token, verificando sesión existente...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Sesión existente encontrada');
        await procesarSesion(session, queryParams.get('type') || hashParams.get('type'));
        return;
      }

      // No hay nada que procesar
      throw new Error('No se encontró información de autenticación en el enlace');

    } catch (error) {
      console.error('❌ Error en callback:', error);
      setEstado('error');
      setMensaje(error.message || 'Error al verificar tu cuenta');
    }
  };

  // Procesar sesión una vez obtenida
  const procesarSesion = async (session, type) => {
    const user = session.user;
    console.log('👤 Procesando sesión para:', user.email);

    // Determinar tipo de callback
    if (type === 'recovery') {
      setTipo('recovery');
      setEstado('exito');
      setMensaje('Ahora puedes cambiar tu contraseña');
      
      setTimeout(() => {
        navigate('/cambiar-password?type=recovery', { replace: true });
      }, 2000);
      return;
    }

    if (type === 'invite') {
      setTipo('invite');
      setEstado('exito');
      setMensaje('Invitación aceptada. Configura tu contraseña.');
      
      setTimeout(() => {
        navigate('/establecer-password', { replace: true });
      }, 2000);
      return;
    }

    // ========== VERIFICACIÓN DE SIGNUP ==========
    setTipo('signup');

    // Verificar si el usuario ya existe en tabla usuarios
    const { data: usuarioExistente, error: errorBusqueda } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    // Si no existe, crearlo usando metadata del auth.user
    if (errorBusqueda || !usuarioExistente) {
      console.log('📝 Usuario no existe en tabla, creando...');
      
      // Obtener datos de metadata
      const metadata = user.user_metadata || {};
      const nombre = metadata.nombre || user.email.split('@')[0];
      const institucionId = metadata.institucion_id || localStorage.getItem('admitio_pending_institucion_id');
      const rol = metadata.rol || 'keymaster';

      if (!institucionId) {
        console.error('❌ No se encontró institucion_id');
        setEstado('error');
        setMensaje('Error: No se encontró la institución. Contacta soporte.');
        return;
      }

      // Crear el registro en tabla usuarios
      const { error: createError } = await supabase
        .from('usuarios')
        .insert({
          auth_id: user.id,
          institucion_id: institucionId,
          email: user.email.toLowerCase(),
          nombre: nombre,
          rol: rol,
          activo: true,
          email_verificado: true
        });

      if (createError) {
        console.error('❌ Error creando usuario:', createError);
        setEstado('error');
        setMensaje('Error al completar el registro. Contacta soporte.');
        return;
      }

      console.log('✅ Usuario creado en tabla usuarios');
      
      // Limpiar localStorage temporal
      localStorage.removeItem('admitio_pending_institucion_id');
      localStorage.removeItem('admitio_pending_email');
    } else {
      // Usuario ya existe, actualizar email_verificado
      console.log('✅ Usuario ya existe, actualizando email_verificado');
      
      await supabase
        .from('usuarios')
        .update({ email_verificado: true })
        .eq('auth_id', user.id);
    }

    setEstado('exito');
    setMensaje('¡Tu cuenta ha sido verificada correctamente!');

    // Redirigir al dashboard
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 2000);
  };

  const handleIrALogin = () => {
    navigate('/login', { replace: true });
  };

  const handleReenviarEmail = async () => {
    const savedEmail = localStorage.getItem('admitio_pending_email');
    
    if (savedEmail && supabase) {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: savedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) throw error;
        alert('Email de verificación reenviado. Revisa tu bandeja de entrada.');
      } catch (err) {
        alert('Error al reenviar: ' + err.message);
      }
    } else {
      navigate('/signup', { replace: true });
    }
  };

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
            <p className="text-gray-600">{mensaje}</p>
          </div>
        )}

        {/* Éxito */}
        {estado === 'exito' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {tipo === 'recovery' ? '¡Listo!' : 
               tipo === 'invite' ? '¡Bienvenido!' : 
               '¡Cuenta verificada!'}
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
  );
};

export default AuthCallback;
