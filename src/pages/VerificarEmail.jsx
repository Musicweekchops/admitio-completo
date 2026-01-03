// ============================================
// ADMITIO - Página de Verificar Email
// src/pages/VerificarEmail.jsx
// Se muestra después del signup exitoso
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GraduationCap, Mail, CheckCircle, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

const VerificarEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Obtener email de state o localStorage
    const emailFromState = location.state?.email;
    const emailFromStorage = localStorage.getItem('admitio_pending_email');
    
    if (emailFromState) {
      setEmail(emailFromState);
    } else if (emailFromStorage) {
      setEmail(emailFromStorage);
    } else {
      // Si no hay email, redirigir a signup
      navigate('/signup');
    }
  }, [location, navigate]);

  // Countdown para habilitar reenvío
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleReenviar = async () => {
    if (!email || countdown > 0) return;
    
    setEnviando(true);
    setError('');
    setReenviado(false);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Sistema no configurado');
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (resendError) {
        throw resendError;
      }

      setReenviado(true);
      setCountdown(60); // Esperar 60 segundos antes de permitir otro reenvío
      
    } catch (err) {
      console.error('Error reenviando email:', err);
      setError(err.message || 'Error al reenviar el correo');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Admitio</span>
        </div>

        {/* Icono de éxito */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Revisa tu correo!
          </h1>
          <p className="text-gray-600">
            Hemos enviado un enlace de verificación a:
          </p>
          <p className="font-semibold text-violet-600 mt-2 text-lg">
            {email}
          </p>
        </div>

        {/* Instrucciones */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Pasos siguientes:
          </h3>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Abre tu bandeja de entrada</li>
            <li>Busca el correo de <strong>Admitio</strong></li>
            <li>Haz clic en el enlace de verificación</li>
            <li>¡Listo! Podrás acceder a tu cuenta</li>
          </ol>
        </div>

        {/* Mensaje de reenviado */}
        {reenviado && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">¡Correo reenviado! Revisa tu bandeja de entrada.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Botón de reenviar */}
        <button
          onClick={handleReenviar}
          disabled={enviando || countdown > 0}
          className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            enviando || countdown > 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {enviando ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : countdown > 0 ? (
            <>
              <RefreshCw className="w-5 h-5" />
              Reenviar en {countdown}s
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Reenviar correo de verificación
            </>
          )}
        </button>

        {/* Nota de spam */}
        <p className="text-xs text-gray-500 text-center mt-4">
          ¿No encuentras el correo? Revisa tu carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.
        </p>

        {/* Separador */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Links adicionales */}
        <div className="space-y-3">
          <Link 
            to="/login" 
            className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            Ya verifiqué mi correo - Iniciar sesión
          </Link>
          
          <Link 
            to="/signup" 
            className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-violet-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Usar otro correo electrónico
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerificarEmail;
