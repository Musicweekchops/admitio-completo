// ============================================
// ADMITIO - Página de Cambiar Contraseña
// src/pages/CambiarPassword.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const CambiarPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  
  // Detectar si viene de un link de reset password
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const [formData, setFormData] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmar: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    actual: false,
    nueva: false,
    confirmar: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Verificar si viene de recovery al cargar
  useEffect(() => {
    const checkRecoveryMode = async () => {
      // Si hay parámetros de tipo recovery en la URL
      const type = searchParams.get('type');
      if (type === 'recovery') {
        setIsRecoveryMode(true);
        setCheckingSession(false);
        return;
      }

      // Verificar sesión de Supabase para recovery
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          // Si hay sesión pero no hay usuario en auth context, probablemente es recovery
          if (session?.user && !auth?.user) {
            setIsRecoveryMode(true);
          }
        } catch (err) {
          console.error('Error verificando sesión:', err);
        }
      }
      
      // Si el usuario debe cambiar password (flag del context)
      if (auth?.user?.debeCambiarPassword || auth?.debeCambiarPassword) {
        setIsRecoveryMode(true);
      }
      
      setCheckingSession(false);
    };
    
    checkRecoveryMode();
  }, [searchParams, auth?.user]);

  // Validaciones de contraseña
  const validaciones = {
    minLength: formData.passwordNueva.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.passwordNueva),
    hasLowercase: /[a-z]/.test(formData.passwordNueva),
    hasNumber: /[0-9]/.test(formData.passwordNueva),
    match: formData.passwordNueva === formData.passwordConfirmar && formData.passwordConfirmar !== '',
  };

  const passwordValida = Object.values(validaciones).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordValida) {
      setError('La contraseña no cumple con los requisitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase no está configurado');
      }

      // Si es recovery mode, actualizar directamente
      if (isRecoveryMode) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.passwordNueva
        });

        if (updateError) throw updateError;

        // Actualizar flag de password temporal si existe
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from('usuarios')
            .update({ 
              password_temporal: false,
              email_verificado: true 
            })
            .eq('auth_id', session.user.id);
        }
      } else {
        // Re-autenticar con password actual primero
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: formData.passwordActual
          });
          if (signInError) throw new Error('Contraseña actual incorrecta');
        }
        
        // Actualizar password
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.passwordNueva
        });
        if (updateError) throw updateError;
      }

      // Actualizar contexto si tiene el método
      if (auth?.actualizarUsuario) {
        auth.actualizarUsuario({ debeCambiarPassword: false });
      }

      setSuccess(true);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        if (auth?.isSuperOwner) {
          navigate('/admin', { replace: true });
        } else if (auth?.user) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 2000);

    } catch (err) {
      console.error('Error cambiando contraseña:', err);
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Loading inicial
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Éxito
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">Admitio</span>
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-gray-600 mb-4">Tu contraseña ha sido cambiada exitosamente.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Redirigiendo...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Admitio</span>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isRecoveryMode ? 'Establece tu contraseña' : 'Cambiar Contraseña'}
          </h1>
          <p className="text-gray-600">
            {isRecoveryMode 
              ? 'Crea una contraseña segura para tu cuenta.'
              : 'Ingresa tu contraseña actual y la nueva.'
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña actual (solo si NO es recovery mode) */}
          {!isRecoveryMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showPasswords.actual ? 'text' : 'password'}
                  required
                  value={formData.passwordActual}
                  onChange={(e) => setFormData({ ...formData, passwordActual: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 pr-10"
                  placeholder="Tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, actual: !showPasswords.actual })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.actual ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.nueva ? 'text' : 'password'}
                required
                value={formData.passwordNueva}
                onChange={(e) => setFormData({ ...formData, passwordNueva: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 pr-10"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, nueva: !showPasswords.nueva })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.nueva ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirmar ? 'text' : 'password'}
                required
                value={formData.passwordConfirmar}
                onChange={(e) => setFormData({ ...formData, passwordConfirmar: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 pr-10"
                placeholder="Repite tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirmar: !showPasswords.confirmar })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirmar ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Requisitos */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Requisitos de la contraseña:</p>
            <div className={`flex items-center gap-2 text-sm ${validaciones.minLength ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className={`w-4 h-4 ${validaciones.minLength ? '' : 'opacity-30'}`} />
              Mínimo 8 caracteres
            </div>
            <div className={`flex items-center gap-2 text-sm ${validaciones.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className={`w-4 h-4 ${validaciones.hasUppercase ? '' : 'opacity-30'}`} />
              Al menos una mayúscula
            </div>
            <div className={`flex items-center gap-2 text-sm ${validaciones.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className={`w-4 h-4 ${validaciones.hasLowercase ? '' : 'opacity-30'}`} />
              Al menos una minúscula
            </div>
            <div className={`flex items-center gap-2 text-sm ${validaciones.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className={`w-4 h-4 ${validaciones.hasNumber ? '' : 'opacity-30'}`} />
              Al menos un número
            </div>
            <div className={`flex items-center gap-2 text-sm ${validaciones.match ? 'text-green-600' : 'text-gray-500'}`}>
              <CheckCircle className={`w-4 h-4 ${validaciones.match ? '' : 'opacity-30'}`} />
              Las contraseñas coinciden
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !passwordValida}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold rounded-lg hover:from-violet-700 hover:to-violet-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Cambiando...
              </span>
            ) : (
              isRecoveryMode ? 'Establecer Contraseña' : 'Cambiar Contraseña'
            )}
          </button>
        </form>

        {/* Link a login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-violet-600 hover:text-violet-700 text-sm font-medium"
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
};

export default CambiarPassword;
