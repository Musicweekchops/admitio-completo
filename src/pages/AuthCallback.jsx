// ============================================
// ADMITIO - Página de Auth Callback
// src/pages/AuthCallback.jsx
// Double-click verification para evitar pre-fetch de Gmail
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GraduationCap, CheckCircle, XCircle, Loader, AlertTriangle, Mail } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando'); // cargando, pendiente, procesando, exito, error
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState('');
  const [pendingCode, setPendingCode] = useState(null);
  const [pendingType, setPendingType] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setEstado('error');
      setMensaje('Supabase no está configurado');
      return;
    }

    detectarCallback();
  }, []);

  // Solo detectar qué tipo de callback es, NO procesar automáticamente
  const detectarCallback = async () => {
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
      // PKCE AUTH CODE FLOW - Guardar código para confirmar después
      // ========================================
      const code = queryParams.get('code');
      const type = queryParams.get('type') || hashParams.get('type');
      
      if (code) {
        console.log('🔐 Código detectado, esperando confirmación del usuario...');
        setPendingCode(code);
        setPendingType(type);
        setTipo(type || 'signup');
        setEstado('pendiente');
        setMensaje('Haz clic en el botón para confirmar tu cuenta');
        return;
      }

      // ========================================
      // LEGACY IMPLICIT FLOW (#access_token=)
      // ========================================
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        console.log('🔐 Token detectado, esperando confirmación...');
        setPendingType(type);
        setTipo(type || 'signup');
        setEstado('pendiente');
        setMensaje('Haz clic en el botón para confirmar tu cuenta');
        return;
      }

      // ========================================
      // SIN CÓDIGO NI TOKEN
      // ========================================
      console.log('⚠️ No se detectó código ni token');
      
      // Verificar si ya hay sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setEstado('exito');
        setMensaje('Ya tienes una sesión activa');
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
        return;
      }

      throw new Error('No se encontró información de autenticación en el enlace');

    } catch (error) {
      console.error('❌ Error detectando callback:', error);
      setEstado('error');
      setMensaje(error.message || 'Error al procesar el enlace');
    }
  };

  // Procesar verificación cuando el usuario hace clic
  const handleConfirmar = async () => {
    setEstado('procesando');
    setMensaje('Verificando tu cuenta...');

    try {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      // Intentar con código PKCE primero
      if (pendingCode) {
        console.log('🔐 Intercambiando código...');
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(pendingCode);
        
        if (exchangeError) {
          console.error('❌ Error intercambiando código:', exchangeError);
          
          if (exchangeError.message.includes('expired')) {
            throw new Error('El enlace ha expirado. Solicita uno nuevo desde el login.');
          }
          if (exchangeError.message.includes('already been used')) {
            throw new Error('Este enlace ya fue utilizado. Si ya verificaste tu cuenta, inicia sesión.');
          }
          
          throw new Error(exchangeError.message);
        }

        if (!data.session) {
          throw new Error('No se pudo establecer la sesión');
        }

        console.log('✅ Código intercambiado exitosamente');
        
        // Limpiar URL
        window.history.replaceState(null, '', window.location.pathname);
        
        await procesarSesion(data.session, pendingType);
        return;
      }

      // Intentar con token legacy
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          throw new Error('No se pudo obtener la sesión');
        }
        
        window.history.replaceState(null, '', window.location.pathname);
        await procesarSesion(session, pendingType);
        return;
      }

      throw new Error('No hay código para procesar');

    } catch (error) {
      console.error('❌ Error en verificación:', error);
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

    // Actualizar email_verificado en nuestra tabla usuarios
    try {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ email_verificado: true })
        .eq('auth_id', user.id);

      if (updateError) {
        console.warn('⚠️ No se pudo actualizar email_verificado:', updateError);
      } else {
        console.log('✅ email_verificado actualizado');
      }
    } catch (err) {
      console.warn('⚠️ Error actualizando usuario:', err);
    }

    if (type === 'invite') {
      setTipo('invite');
      setEstado('exito');
      setMensaje('¡Tu cuenta ha sido verificada! Ya puedes iniciar sesión.');
      
      // Cerrar sesión para que entre con sus credenciales
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
      return;
    }

    // Signup normal
    setTipo('signup');
    localStorage.removeItem('admitio_pending_email');
    setEstado('exito');
    setMensaje('¡Tu cuenta ha sido verificada correctamente!');

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

        {/* Cargando */}
        {estado === 'cargando' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Cargando...
            </h2>
          </div>
        )}

        {/* Pendiente - Esperando confirmación del usuario */}
        {estado === 'pendiente' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {tipo === 'invite' ? '¡Bienvenido al equipo!' : 
               tipo === 'recovery' ? 'Recuperar contraseña' :
               'Verificar tu cuenta'}
            </h2>
            <p className="text-gray-600 mb-6">
              {tipo === 'invite' 
                ? 'Haz clic en el botón para activar tu cuenta'
                : 'Haz clic en el botón para completar la verificación'}
            </p>
            
            <button
              onClick={handleConfirmar}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-violet-800 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Confirmar mi cuenta
            </button>
            
            <p className="text-xs text-gray-400 mt-4">
              Al confirmar, aceptas nuestros términos de servicio
            </p>
          </div>
        )}

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
